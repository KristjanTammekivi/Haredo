import { AMQPClient, AMQPProperties, AMQPQueue, ExchangeParams, QueueParams } from '@cloudamqp/amqp-client';
import { Consumer, SubscribeArguments, createAdapter } from './adapter';
import { MissingQueueNameError } from './errors';
import { ExchangeArguments, ExchangeInterface, ExchangeType, InternalExchange } from './exchange';
import { HaredoMessage } from './types';
import { Queue, QueueArguments, QueueInterface } from './queue';
import type {
    ExchangeChain,
    ExchangeChainState,
    Extension,
    HaredoInstance,
    HaredoOptions,
    QueueChain,
    QueueChainState
} from './types';
import { applyMiddleware } from './utils/apply-middleware';
import { castArray } from './utils/cast-array';
import { mergeState } from './utils/merge-state';

export const Haredo = ({
    url,
    tlsOptions,
    appId,
    extensions = [],
    globalMiddleware = [],
    adapter = createAdapter(AMQPClient, AMQPQueue, { url, tlsOptions })
}: HaredoOptions): HaredoInstance => {
    return {
        connect: async () => {
            await adapter.connect();
        },
        close: async (force) => {
            await adapter.close(force);
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
            return exchangeChain<T>({ adapter, exchange, appId }, extensions);
        },
        queue: <T = unknown>(
            queue: string | QueueInterface<T>,
            queueParams?: QueueParams,
            queueArguments?: QueueArguments
        ) => {
            if (typeof queue === 'string') {
                queue = Queue(queue, queueParams, queueArguments);
            }
            return queueChain<T>({ adapter, queue, middleware: [...globalMiddleware], appId }, extensions);
        }
    };
};

const exchangeChain = <T = unknown>(state: ExchangeChainState, extensions: Extension[]): ExchangeChain<T> => {
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
    const setArgument = (key: keyof AMQPProperties, value: AMQPProperties[keyof AMQPProperties]) => {
        return exchangeChain(
            mergeState(state, { publishOptions: { ...state.publishOptions, [key]: value } }),
            extensions
        );
    };
    return {
        setup,
        setArgument,
        delay: (milliseconds: number) => {
            return exchangeChain(mergeState(state, { headers: { 'x-delay': milliseconds } }), extensions);
        },
        json: (json) => {
            return exchangeChain({ ...state, json }, extensions);
        },
        confirm: () => {
            return exchangeChain({ ...state, confirm: true }, extensions);
        },
        type: (type) => {
            return setArgument('type', type);
        },
        skipSetup: (skip = true) => {
            return exchangeChain({ ...state, skipSetup: skip }, extensions);
        },
        publish: async (message: T, routingKey: string) => {
            await setup();
            await state.adapter.publish(
                state.exchange.name,
                routingKey,
                state.json === false ? (message as unknown as string) : JSON.stringify(message),
                {
                    ...(state.appId ? { appId: state.appId } : {}),
                    contentType: 'application/json',
                    confirm: !!state.confirm,
                    ...state.publishOptions,
                    ...(state.headers ? { headers: state.headers } : {})
                }
            );
        },
        ...Object.fromEntries(
            extensions
                .filter((x) => x.exchange)
                .map((extension) => [
                    extension.name,
                    (...args: any[]) => {
                        const modifiedState = extension.exchange!(state)(...args);
                        return exchangeChain(modifiedState, extensions);
                    }
                ])
        )
    };
};

const queueChain = <T = unknown>(state: QueueChainState<T>, extensions: Extension[]): QueueChain<T> => {
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
    const setPublishOption = (key: keyof AMQPProperties, value: AMQPProperties[keyof AMQPProperties]) => {
        return queueChain(mergeState(state, { publishOptions: { ...state.publishOptions, [key]: value } }), extensions);
    };
    const setSubscribeArgument = (
        key: keyof SubscribeArguments,
        value: SubscribeArguments[keyof SubscribeArguments]
    ) => {
        return queueChain(
            mergeState(state, { subscribeArguments: { ...state.subscribeArguments, [key]: value } }),
            extensions
        );
    };
    return {
        setup,
        setPublishArgument: setPublishOption,
        backoff: (backoff) => {
            return queueChain(mergeState(state, { backoff }), extensions);
        },
        use: (...middleware) => {
            return queueChain(mergeState(state, { middleware }), extensions);
        },
        json: (json) => {
            return queueChain({ ...state, json }, extensions);
        },
        confirm: () => {
            return queueChain(
                {
                    ...state,
                    confirm: true
                },
                extensions
            );
        },
        skipSetup: () => {
            return queueChain(
                {
                    ...state,
                    skipSetup: true
                },
                extensions
            );
        },
        concurrency: (count: number) => {
            return queueChain(
                {
                    ...state,
                    prefetch: count
                },
                extensions
            );
        },
        prefetch: (count: number) => {
            return queueChain(
                {
                    ...state,
                    prefetch: count
                },
                extensions
            );
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
                    ...(state.appId ? { appId: state.appId } : {}),
                    ...(state.json === false ? {} : { contentType: 'application/json' }),
                    ...state.publishOptions,
                    ...(state.headers ? { headers: state.headers } : {}),
                    confirm: !!state.confirm
                }
            );
        },
        bindExchange: (exchange: string | ExchangeInterface, patterns: string | string[], type?: ExchangeType) => {
            const binding = {
                exchange: typeof exchange === 'string' ? InternalExchange(exchange, type!) : exchange,
                patterns: castArray(patterns)
            };
            return queueChain(
                {
                    ...state,
                    bindings: [...(state.bindings || []), binding]
                },
                extensions
            );
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
                        args: state.subscribeArguments,
                        // TODO: make configurable
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
        },
        type: (type: string) => {
            return setPublishOption('type', type);
        },
        streamOffset: (offset) => {
            return setSubscribeArgument('x-stream-offset', offset);
        },
        ...Object.fromEntries(
            extensions
                .filter((x) => x.queue)
                .map((extension) => [
                    extension.name,
                    (...args: any[]) => {
                        const modifiedState = extension.queue!(state)(...args);
                        return queueChain(modifiedState, extensions);
                    }
                ])
        )
    };
};
