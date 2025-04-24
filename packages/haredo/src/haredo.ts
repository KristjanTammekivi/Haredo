import { AMQPClient, AMQPProperties, AMQPQueue, ExchangeParams, QueueParams } from '@cloudamqp/amqp-client';
import { createAdapter } from './adapter';
import { MissingQueueNameError } from './errors';
import { InternalExchange } from './exchange';
import { HaredoMessage, BindingArguments, Consumer, SubscribeArguments } from './types';
import { Queue } from './queue';
import type {
    ExchangeArguments,
    ExchangeChain,
    ExchangeChainState,
    ExchangeInterface,
    ExchangeType,
    Extension,
    HaredoEvents,
    HaredoInstance,
    HaredoOptions,
    ExtensionInterface,
    IterateExtension,
    QueueArguments,
    QueueChain,
    QueueChainState,
    QueueInterface,
    SkipSetupOptions
} from './types';
import { applyMiddleware } from './utils/apply-middleware';
import { castArray } from './utils/cast-array';
import { mergeState } from './utils/merge-state';
import { Logger, createLogger } from './utils/logger';
import { TypedEventEmitter } from './utils/typed-event-emitter';

export const Haredo = <E extends ExtensionInterface = object>({
    url,
    tlsOptions,
    reconnectDelay,
    defaults = {},
    extensions = [],
    globalMiddleware = [],
    log = () => {},
    adapter,
    autoConnect = false
}: HaredoOptions): HaredoInstance<E> => {
    const logger = createLogger(log).component('haredo');
    adapter =
        adapter ??
        createAdapter(AMQPClient, AMQPQueue, { url, tlsOptions, reconnectDelay }, logger.component('adapter'));
    const emitter = new TypedEventEmitter<HaredoEvents>();
    adapter.emitter.on('connected', () => {
        emitter.emit('connected', null);
    });
    adapter.emitter.on('disconnected', () => {
        emitter.emit('disconnected', null);
    });
    adapter.emitter.on('connecting', (data) => {
        emitter.emit('connecting', data);
    });
    adapter.emitter.on('connectingFailed', (info) => {
        emitter.emit('connectingFailed', info);
    });
    if (autoConnect) {
        void adapter.connect();
    }
    return {
        emitter,
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
            return exchangeChain<T>(
                { emitter, adapter, exchange, appId: defaults.appId },
                logger,
                extensions
            ) as ExchangeChain<T> & IterateExtension<E['exchange'], ExchangeChain<T>>;
        },
        queue: <T = unknown>(
            queue: string | QueueInterface<T>,
            queueParams?: QueueParams,
            queueArguments?: QueueArguments
        ) => {
            if (typeof queue === 'string') {
                queue = Queue(queue, queueParams, queueArguments);
            }
            return queueChain<T>(
                {
                    emitter,
                    adapter,
                    queue,
                    middleware: [...globalMiddleware],
                    appId: defaults.appId,
                    prefetch: defaults.concurrency,
                    reestablish: true
                },
                logger,
                extensions
            ) as QueueChain<T> & IterateExtension<E['queue'], QueueChain<T>>;
        }
    };
};

const exchangeChain = <T = unknown>(
    state: ExchangeChainState,
    logger: Logger,
    extensions: Extension[]
): ExchangeChain<T> => {
    const setup = async () => {
        if (!state.skipSetup?.skipCreate) {
            await state.adapter.createExchange(
                state.exchange.name,
                state.exchange.type,
                state.exchange.params,
                state.exchange.args
            );
        }
        if (!state.bindings) {
            return;
        }
        await Promise.all(
            state.bindings.map(async (binding) => {
                if (!state.skipSetup?.skipBoundExchanges) {
                    await state.adapter.createExchange(
                        binding.exchange.name,
                        binding.exchange.type,
                        binding.exchange.params,
                        binding.exchange.args
                    );
                }
                for (const pattern of binding.patterns) {
                    await state.adapter.bindExchange(
                        state.exchange.name,
                        binding.exchange.name,
                        pattern,
                        binding.bindingArguments
                    );
                }
            })
        );
    };
    const setArgument = (key: keyof AMQPProperties, value: AMQPProperties[keyof AMQPProperties]) => {
        return exchangeChain(
            mergeState(state, { publishOptions: { ...state.publishOptions, [key]: value } }),
            logger,
            extensions
        );
    };
    const setHeader = (key: string, value: any) => {
        return exchangeChain(mergeState(state, { headers: { ...state.headers, [key]: value } }), logger, extensions);
    };
    return {
        setup,
        setArgument,
        delay: (milliseconds: number) => {
            return exchangeChain(mergeState(state, { headers: { 'x-delay': milliseconds } }), logger, extensions);
        },
        json: (json) => {
            return exchangeChain({ ...state, json }, logger, extensions);
        },
        confirm: () => {
            return exchangeChain({ ...state, confirm: true }, logger, extensions);
        },
        type: (type) => {
            return setArgument('type', type);
        },
        skipSetup: (skip = true) => {
            const skipSetupOptions: SkipSetupOptions =
                typeof skip === 'boolean'
                    ? {
                          skipBindings: true,
                          skipBoundExchanges: true,
                          skipCreate: true
                      }
                    : {
                          skipBindings: skip.skipBindings ?? true,
                          skipBoundExchanges: skip.skipBoundExchanges ?? true,
                          skipCreate: skip.skipCreate ?? true
                      };
            return exchangeChain({ ...state, skipSetup: skipSetupOptions }, logger, extensions);
        },
        priority: (priority: number) => {
            return setArgument('priority', priority);
        },
        setHeader,
        expiration: (ms: number) => {
            return setArgument('expiration', `${ ms }`);
        },
        bindExchange: (
            exchange: string | ExchangeInterface,
            patterns: string | string[],
            type?: ExchangeType | BindingArguments,
            exchangeParams?: BindingArguments | ExchangeParams,
            exchangeArguments?: ExchangeArguments,
            bindingArguments?: BindingArguments
        ) => {
            bindingArguments = typeof type === 'object' ? type : bindingArguments;
            const binding = {
                exchange:
                    typeof exchange === 'string'
                        ? InternalExchange(
                              exchange,
                              type as ExchangeType,
                              exchangeParams as ExchangeParams,
                              exchangeArguments
                          )
                        : exchange,
                patterns: castArray(patterns),
                bindingArguments
            };
            return exchangeChain(
                {
                    ...state,
                    bindings: [...(state.bindings || []), binding]
                },
                logger,
                extensions
            );
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
        delete: async (options) => {
            await state.adapter.deleteExchange(state.exchange.name, options);
        },
        unbindExchange: async (
            exchange: string | ExchangeInterface,
            patterns: string | string[],
            bindingArguments?: BindingArguments
        ) => {
            const exchangeName = typeof exchange === 'string' ? exchange : exchange.name;
            const patternsArray = castArray(patterns);
            for (const pattern of patternsArray) {
                await state.adapter.unbindExchange(state.exchange.name, exchangeName, pattern, bindingArguments);
            }
        },
        ...Object.fromEntries(
            extensions
                .filter((x) => x.exchange)
                .map((extension) => [
                    extension.name,
                    (...args: any[]) => {
                        const modifiedState = extension.exchange!(state)(...args);
                        return exchangeChain(modifiedState, logger, extensions);
                    }
                ])
        )
    };
};

const queueChain = <T = unknown>(state: QueueChainState<T>, logger: Logger, extensions: Extension[]): QueueChain<T> => {
    const setup = async () => {
        const setupLogger = logger.component('setup');
        let queueName = state.queue.name;
        if (!state.skipSetup?.skipCreate) {
            setupLogger.debug('Asserting queue', state.queue.name);
            queueName = await state.adapter.createQueue(state.queue.name, state.queue.params, state.queue.args);
        }
        if (!state.bindings) {
            return;
        }
        await Promise.all(
            state.bindings.map(async (binding) => {
                if (!state.skipSetup?.skipBoundExchanges) {
                    setupLogger.debug('Asserting exchange', binding.exchange.name);
                    await state.adapter.createExchange(
                        binding.exchange.name,
                        binding.exchange.type,
                        binding.exchange.params,
                        binding.exchange.args
                    );
                }
                for (const pattern of binding.patterns) {
                    setupLogger.debug('Binding queue', queueName, 'to exchange', binding.exchange.name);
                    await state.adapter.bindQueue(queueName!, binding.exchange.name, pattern, binding.bindingArguments);
                }
            })
        );
    };
    const setPublishOption = (key: keyof AMQPProperties, value: AMQPProperties[keyof AMQPProperties]) => {
        return queueChain<T>(
            mergeState(state, { publishOptions: { ...state.publishOptions, [key]: value } }),
            logger,
            extensions
        );
    };
    const setSubscribeArgument = (
        key: keyof SubscribeArguments,
        value: SubscribeArguments[keyof SubscribeArguments]
    ) => {
        return queueChain(
            mergeState(state, { subscribeArguments: { ...state.subscribeArguments, [key]: value } }),
            logger,
            extensions
        );
    };
    const setHeader = (key: string, value: any) => {
        return queueChain(mergeState(state, { headers: { ...state.headers, [key]: value } }), logger, extensions);
    };
    return {
        setup,
        reestablish: (reestablish = true) => {
            return queueChain(mergeState(state, { reestablish }), logger, extensions);
        },
        noAck: (noAck = true) => {
            return queueChain(mergeState(state, { noAck }), logger, extensions);
        },
        exclusive: (exclusive = true) => {
            return queueChain(mergeState(state, { exclusive }), logger, extensions);
        },
        setPublishArgument: setPublishOption,
        backoff: (backoff) => {
            return queueChain(mergeState(state, { backoff }), logger, extensions);
        },
        use: (...middleware) => {
            return queueChain(mergeState(state, { middleware }), logger, extensions);
        },
        json: (json) => {
            return queueChain({ ...state, json }, logger, extensions);
        },
        confirm: () => {
            return queueChain(
                {
                    ...state,
                    confirm: true
                },
                logger,
                extensions
            );
        },
        skipSetup: (skip = true) => {
            const skipSetupOptions: SkipSetupOptions =
                typeof skip === 'boolean'
                    ? { skipCreate: skip, skipBindings: skip, skipBoundExchanges: skip }
                    : {
                          skipCreate: skip.skipCreate ?? true,
                          skipBindings: skip.skipBindings ?? true,
                          skipBoundExchanges: skip.skipBoundExchanges ?? true
                      };
            return queueChain(
                {
                    ...state,
                    skipSetup: skipSetupOptions
                },
                logger,
                extensions
            );
        },
        concurrency: (count: number) => {
            return queueChain(
                {
                    ...state,
                    prefetch: count
                },
                logger,
                extensions
            );
        },
        prefetch: (count: number) => {
            return queueChain(
                {
                    ...state,
                    prefetch: count
                },
                logger,
                extensions
            );
        },
        priority: (priority: number) => {
            return setPublishOption('priority', priority);
        },
        setHeader,
        expiration: (ms: number) => {
            return setPublishOption('expiration', `${ ms }`);
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
                state.json === false ? (message as string) : JSON.stringify(message),
                {
                    ...(state.appId ? { appId: state.appId } : {}),
                    ...(state.json === false ? {} : { contentType: 'application/json' }),
                    ...state.publishOptions,
                    ...(state.headers ? { headers: state.headers } : {}),
                    confirm: !!state.confirm
                }
            );
        },
        bindExchange: (
            exchange: string | ExchangeInterface,
            patterns: string | string[],
            type?: ExchangeType | BindingArguments,
            exchangeParams?: BindingArguments | ExchangeParams,
            exchangeArguments?: ExchangeArguments,
            bindingArguments?: BindingArguments
        ) => {
            bindingArguments = typeof type === 'object' ? type : bindingArguments;
            const exchangeObject =
                typeof exchange === 'string'
                    ? InternalExchange(
                          exchange,
                          type as ExchangeType,
                          exchangeParams as ExchangeParams,
                          exchangeArguments
                      )
                    : exchange;
            const binding = {
                exchange: exchangeObject,
                patterns: exchangeObject.type === 'headers' ? ['#'] : castArray(patterns),
                bindingArguments
            };
            return queueChain(
                {
                    ...state,
                    bindings: [...(state.bindings || []), binding]
                },
                logger,
                extensions
            );
        },
        subscribe: async (callback) => {
            const subscribeLogger = logger.component('subscribe');
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
                            if (!state.reestablish) {
                                subscribeLogger.setError(reason).info('Connection closed, not reestablishing');
                                isCancelled = true;
                                return;
                            }
                            await subscribe();
                        },
                        prefetch: state.prefetch,
                        args: state.subscribeArguments,
                        parseJson: state.json,
                        noAck: state.noAck ?? false,
                        exclusive: state.exclusive ?? false
                    },
                    async (message: HaredoMessage<T>) => {
                        message.emitter.once('ack', () => {
                            state.emitter.emit('message:ack', message);
                            state.backoff?.ack?.();
                        });
                        message.emitter.once('nack', (requeue) => {
                            state.emitter.emit('message:nack', [requeue, message]);
                            state.backoff?.nack?.(requeue);
                        });
                        await state.backoff?.take();
                        try {
                            await applyMiddleware(state.middleware, callback, message);
                        } catch (error) {
                            subscribeLogger.setError(error).setMessage(message).error('Error thrown in subscribe');
                            state.emitter.emit('message:error', [error, message]);
                            state.backoff?.fail?.(error);
                            try {
                                await message.nack(true);
                            } catch (nackingError) {
                                subscribeLogger
                                    .setError(nackingError)
                                    .setMessage(message)
                                    .error('Error nacking message');
                            }
                            return;
                        }
                        try {
                            await message.ack();
                        } catch (error) {
                            subscribeLogger.setError(error).setMessage(message).error('Error acking message');
                            return;
                        }
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
        delete: async (options) => {
            if (!state.queue.name) {
                throw new MissingQueueNameError();
            }
            logger.info('Deleting queue', state.queue.name);
            await state.adapter.deleteQueue(state.queue.name, options);
        },
        purge: async () => {
            if (!state.queue.name) {
                throw new MissingQueueNameError();
            }
            logger.info('Purging queue', state.queue.name);
            await state.adapter.purgeQueue(state.queue.name);
        },
        unbindExchange: async (
            exchange: string | ExchangeInterface,
            patterns: string | string[],
            bindingArguments?: BindingArguments
        ) => {
            if (!state.queue.name) {
                throw new MissingQueueNameError();
            }
            const exchangeName = typeof exchange === 'string' ? exchange : exchange.name;
            const patternsArray = castArray(patterns);
            for (const pattern of patternsArray) {
                await state.adapter.unbindQueue(state.queue.name, exchangeName, pattern, bindingArguments);
            }
        },
        ...Object.fromEntries(
            extensions
                .filter((x) => x.queue)
                .map((extension) => [
                    extension.name,
                    (...args: any[]) => {
                        const modifiedState = extension.queue!(state)(...args);
                        return queueChain(modifiedState, logger, extensions);
                    }
                ])
        )
    };
};
