import { AMQPClient, AMQPQueue, AMQPTlsOptions, ExchangeParams } from '@cloudamqp/amqp-client';
import { Adapter, Consumer, createAdapter } from './adapter';
import { MissingQueueNameError } from './errors';
import { ExchangeArguments, ExchangeInterface, ExchangeType, InternalExchange } from './exchange';
import { HaredoMessage } from './haredo-message';
import { Queue, QueueInterface } from './queue';
import { castArray } from './utils/cast-array';
import { Middleware, applyMiddleware } from './utils/apply-middleware';
import { FailureBackoff } from './backoffs';
import type { RabbitUrl } from './types';
import { mergeState } from './utils/merge-state';

interface HaredoOptions {
    url: string | RabbitUrl;
    tlsOptions?: AMQPTlsOptions;
    adapter?: Adapter;
}

export interface HaredoInstance {
    connect(): Promise<void>;
    exchange<T = unknown>(exchange: ExchangeInterface<T>): ExchangeChain<T>;

    exchange<T = unknown>(
        exchange: string,
        type: ExchangeType,
        parameters?: ExchangeParams,
        args?: ExchangeArguments
    ): ExchangeChain<T>;
    queue<T = unknown>(queue: string | QueueInterface<T>): QueueChain<T>;
    close(): Promise<void>;
}

export const Haredo = ({ url, adapter = createAdapter(AMQPClient, AMQPQueue, url) }: HaredoOptions): HaredoInstance => {
    return {
        connect: async () => {
            await adapter.connect();
        },
        close: async () => {
            await adapter.close();
        },
        exchange: <T = unknown>(
            exchange: string | ExchangeInterface<T>,
            type?: ExchangeType,
            // eslint-disable-next-line unicorn/prevent-abbreviations
            params = {} as ExchangeParams,
            args = {} as ExchangeArguments
        ) => {
            if (typeof exchange === 'string') {
                exchange = InternalExchange(exchange, type!, params, args);
            }
            return exchangeChain<T>({ adapter, exchange });
        },
        queue: <T = unknown>(queue: string | QueueInterface<T>) => {
            if (typeof queue === 'string') {
                queue = Queue(queue);
            }
            return queueChain<T>({ adapter, queue, middleware: [] });
        }
    };
};

interface ChainState {
    adapter: Adapter;
    skipSetup?: boolean;
    confirm?: boolean;
    json?: boolean;
    bindings?: { exchange: ExchangeInterface; pattern: string }[];
    headers?: Record<string, string | number>;
}

export interface QueueChainState<T> extends ChainState {
    queue: QueueInterface;
    middleware: Middleware<T>[];
    prefetch?: number;
    backoff?: FailureBackoff;
}

export interface ExchangeChainState extends ChainState {
    exchange: ExchangeInterface;
}

const exchangeChain = <T = unknown>(state: ExchangeChainState): ExchangeChain<T> => {
    const setup = async () => {
        if (state.skipSetup) {
            return;
        }
        await state.adapter.createExchange(
            state.exchange.name,
            state.exchange.type,
            state.exchange.params,
            state.exchange.args
        );
        // TODO: E2E bindings?
    };
    return {
        setup,
        delay: (milliseconds: number) => {
            return exchangeChain(mergeState(state, { headers: { 'x-delay': milliseconds } }));
        },
        json: (json) => {
            return exchangeChain({ ...state, json });
        },
        confirm: () => {
            return exchangeChain({ ...state, confirm: true });
        },
        skipSetup: (skip = true) => {
            return exchangeChain({ ...state, skipSetup: skip });
        },
        publish: async (message: T, routingKey: string) => {
            await setup();
            await state.adapter.publish(
                state.exchange.name,
                routingKey,
                state.json === false ? (message as unknown as string) : JSON.stringify(message),
                {
                    contentType: 'application/json',
                    confirm: !!state.confirm,
                    ...(state.headers ? { headers: state.headers } : {})
                }
            );
        }
    };
};

export interface SharedChain {
    setup: () => Promise<void>;
    confirm: () => this;
    json: (stringify?: boolean) => this;
}

interface ExchangeChain<T = unknown> extends SharedChain {
    skipSetup: (skip?: boolean) => ExchangeChain<T>;
    publish: (message: T, routingKey: string) => Promise<void>;
    delay: (milliseconds: number) => ExchangeChain<T>;
}

const queueChain = <T = unknown>(state: QueueChainState<T>): QueueChain<T> => {
    const setup = async () => {
        if (state.skipSetup) {
            return;
        }
        const queueName = await state.adapter.createQueue(state.queue.name, state.queue.params, state.queue.args);
        if (!state.bindings) {
            return;
        }
        await Promise.all(
            state.bindings.map(async (binding) => {
                await state.adapter.createExchange(binding.exchange.name, binding.exchange.type);
                await state.adapter.bindQueue(queueName, binding.exchange.name, binding.pattern);
            })
        );
    };
    return {
        setup,
        backoff: (backoff) => {
            return queueChain(mergeState(state, { backoff }));
        },
        use: (...middleware) => {
            return queueChain(mergeState(state, { middleware }));
        },
        json: (json) => {
            return queueChain({ ...state, json });
        },
        confirm: () => {
            return queueChain({
                ...state,
                confirm: true
            });
        },
        skipSetup: () => {
            return queueChain({
                ...state,
                skipSetup: true
            });
        },
        concurrency: (count: number) => {
            return queueChain({
                ...state,
                prefetch: count
            });
        },
        prefetch: (count: number) => {
            return queueChain({
                ...state,
                prefetch: count
            });
        },
        publish: async (message: any) => {
            await setup();
            if (!state.queue.name) {
                throw new MissingQueueNameError();
            }
            if (state.json === false) {
            }
            return state.adapter.sendToQueue(
                state.queue.name,
                state.json === false ? (message as unknown as string) : JSON.stringify(message),
                {
                    ...(state.json === false ? {} : { contentType: 'application/json' }),
                    confirm: !!state.confirm
                }
            );
        },
        bindExchange: (exchange: string | ExchangeInterface, patterns: string | string[], type?: ExchangeType) => {
            const exchanges = castArray(patterns).map((pattern) => ({
                exchange: typeof exchange === 'string' ? InternalExchange(exchange, type!) : exchange,
                pattern: pattern
            }));
            return queueChain({
                ...state,
                bindings: [...(state.bindings || []), ...exchanges]
            });
        },
        subscribe: async (callback) => {
            await setup();
            let isCancelled = false;
            let consumer: Consumer;
            const subscribe = async () => {
                if (!state.queue.name) {
                    throw new MissingQueueNameError();
                }
                consumer = await state.adapter.subscribe(
                    state.queue.name,
                    {
                        onClose: async (reason: Error | null) => {
                            if (isCancelled || reason === null) {
                                return;
                            }
                            await subscribe();
                        },
                        prefetch: state.prefetch,
                        noAck: false,
                        exclusive: false
                    },
                    async (message: HaredoMessage<T>) => {
                        message.emitter.once('ack', () => {
                            state.backoff?.ack?.();
                        });
                        message.emitter.once('nack', (requeue) => {
                            state.backoff?.nack?.(requeue);
                        });
                        await state.backoff?.take();
                        try {
                            await applyMiddleware(state.middleware, callback, message);
                        } catch (error) {
                            await message.nack(false);
                            state.backoff?.fail?.(error);
                            return;
                        }
                        await message.ack();
                        state.backoff?.pass?.();
                    }
                );
            };
            await subscribe();
            return {
                cancel: async () => {
                    isCancelled = true;
                    await consumer.cancel();
                }
            };
        }
    };
};

export type SubscribeCallback<T> = (data: T, message: HaredoMessage<T>) => any;

interface QueueChain<T = unknown> extends SharedChain, QueueSubscribeChain<T>, QueuePublishChain<T> {
    skipSetup: () => QueueChain<T>;
}

export interface QueuePublishChain<T> {
    publish: (message: T) => Promise<void>;
}

export interface HaredoConsumer {
    cancel: () => Promise<void>;
}

export interface QueueSubscribeChain<T> {
    subscribe(callback: SubscribeCallback<T>): Promise<HaredoConsumer>;
    use(...middleware: Middleware<T>[]): QueueSubscribeChain<T>;
    concurrency(count: number): QueueSubscribeChain<T>;
    prefetch(count: number): QueueSubscribeChain<T>;
    backoff(backoff: FailureBackoff): QueueSubscribeChain<T>;
    bindExchange(name: string, routingKey: string | string[], type: ExchangeType): QueueSubscribeChain<T>;
    bindExchange(exchange: ExchangeInterface, routingKey: string | string[]): QueueSubscribeChain<T>;
}
