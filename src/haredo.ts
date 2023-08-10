import { AMQPClient, AMQPQueue, AMQPTlsOptions } from '@cloudamqp/amqp-client';
import { Adapter, Consumer, createAdapter } from './adapter';
import { MissingQueueNameError } from './errors';
import { Exchange, ExchangeInterface, ExchangeType } from './exchange';
import { HaredoMessage } from './haredo-message';
import { Queue, QueueInterface } from './queue';
import { castArray } from './utils/cast-array';
import { Middleware, applyMiddleware } from './utils/apply-middleware';
import { FailureBackoff } from './backoffs';

interface HaredoOptions {
    // TODO: allow an object instead of string for url
    url: string;
    tlsOptions?: AMQPTlsOptions;
    adapter?: Adapter;
}

export interface HaredoInstance {
    connect(): Promise<void>;
    exchange<T = unknown>(exchange: ExchangeInterface<T>): ExchangeChain<T>;
    exchange<T = unknown>(exchange: string, type: ExchangeType): ExchangeChain<T>;
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
        exchange: <T = unknown>(exchange: string | ExchangeInterface<T>, type?: ExchangeType) => {
            if (typeof exchange === 'string') {
                exchange = Exchange(exchange, type as ExchangeType);
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

interface QueueChainState<T> extends ChainState {
    queue: QueueInterface;
    middleware: Middleware<T>[];
    prefetch?: number;
    backoff?: FailureBackoff;
}

interface ExchangeChainState extends ChainState {
    exchange: ExchangeInterface;
}

const exchangeChain = <T = unknown>(state: ExchangeChainState): ExchangeChain<T> => {
    const setup = async () => {
        if (state.skipSetup) {
            return;
        }
        await state.adapter.createExchange(state.exchange.name, state.exchange.type);
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

const mergeState = <T extends ExchangeChainState | QueueChainState<unknown>>(base: T, top: Partial<T>): T => {
    const arrayProperties = Object.entries(top).filter(([key, value]) => Array.isArray(value));
    return {
        ...base,
        ...top,
        ...Object.fromEntries(
            arrayProperties.map(([key, value]) => {
                const baseValue = (base as any)[key] || [];
                const updatedValue = [...baseValue, ...value];
                return [key, updatedValue];
            })
        )
    };
};

const queueChain = <T = unknown>(state: QueueChainState<T>): QueueChain<T> => {
    const setup = async () => {
        if (state.skipSetup) {
            return;
        }
        const queueName = await state.adapter.createQueue(state.queue.name, { durable: true });
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
        bindExchange: (name: string, patterns: string | string[], type: ExchangeType) => {
            const exchanges = castArray(patterns).map((pattern) => ({
                exchange: Exchange(name, type),
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

export type SubscribeCallback<T> = (message: HaredoMessage<T>) => any;

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
    bindExchange: (name: string, routingKey: string | string[], type: ExchangeType) => QueueSubscribeChain<T>;
}
