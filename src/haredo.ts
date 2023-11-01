import { AMQPClient, AMQPQueue, ExchangeParams } from '@cloudamqp/amqp-client';
import { Consumer, createAdapter } from './adapter';
import { MissingQueueNameError } from './errors';
import { ExchangeArguments, ExchangeInterface, ExchangeType, InternalExchange } from './exchange';
import { HaredoMessage } from './haredo-message';
import { Queue, QueueInterface } from './queue';
import type {
    ExchangeChain,
    ExchangeChainState,
    HaredoInstance,
    HaredoOptions,
    QueueChain,
    QueueChainState
} from './types';
import { applyMiddleware } from './utils/apply-middleware';
import { castArray } from './utils/cast-array';
import { mergeState } from './utils/merge-state';

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
                await state.adapter.createExchange(
                    binding.exchange.name,
                    binding.exchange.type,
                    binding.exchange.params,
                    binding.exchange.args
                );
                for (const pattern of binding.patterns) {
                    await state.adapter.bindQueue(queueName, binding.exchange.name, pattern);
                }
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
            const binding = {
                exchange: typeof exchange === 'string' ? InternalExchange(exchange, type!) : exchange,
                patterns: castArray(patterns)
            };
            return queueChain({
                ...state,
                bindings: [...(state.bindings || []), binding]
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
                            // TODO: log / emit error
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
