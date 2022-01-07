import { Message, Options, Replies } from 'amqplib';
import { FailureBackoff } from './backoffs';
import { ConnectionOptions, makeConnectionManager } from './connection-manager';
import { Consumer, makeConsumer, MessageCallback } from './consumer';
import { Exchange, ExchangeOptions, ExchangeType, makeExchangeConfig, StandardExchangeType } from './exchange';
import { HaredoMessage } from './haredo-message';
import { ExtendedPublishOptions, isHaredoPreparedMessage, mergeMessageState, MessageChain, preparedMessage } from './prepared-message';
import { makeQueueConfig, Queue } from './queue';
import { generateCorrelationId } from './rpc';
import { defaultState, HaredoChainState, Logger, Loggers, Middleware } from './state';
import { merge, MergeTypes, omitUndefined, promiseMap } from './utils';
import { InvalidOptionsError } from './errors';

// TODO: make this file smaller
// TODO: add a configuration option for max connection attempts
// TODO: different failurebackoffs

export interface LogItem {
    level: LogLevel;
    component: string;
    msg: string;
    message?: HaredoMessage;
    rawMessage?: Message;
    error?: Error;
    timestamp: Date;
}

export interface HaredoOptions {
    connection?: ConnectionOptions | string;
    socketOpts?: any;
    logger?(log: LogItem): void;
}

export enum LogLevel {
    'DEBUG' = 'DEBUG',
    'INFO' = 'INFO',
    'WARNING' = 'WARNING',
    'ERROR' = 'ERROR'
}

export interface Haredo extends InitialChain<unknown, unknown> {
    /**
     * Cancel all consumers, wait for them to finish processing their messages
     * and then close the connection to the broker
     */
    close(): Promise<void>;
    /**
     * Connect to RabbitMQ. Note: this is not needed, Haredo connects automatically
     */
    connect(): Promise<void>;
}

const makeLogger = (level: LogLevel, logger: (log: LogItem) => void): Logger =>
    ({ component, msg, message, rawMessage, error }) =>
        logger(omitUndefined({ component, msg, message, rawMessage, error, level, timestamp: new Date() }));

export const haredo = ({ connection, socketOpts, logger = () => {} }: HaredoOptions): Haredo => {
    validateConnectionOptions(connection);
    const log: Loggers = {
        debug: makeLogger(LogLevel.DEBUG, logger),
        info: makeLogger(LogLevel.INFO, logger),
        warning: makeLogger(LogLevel.WARNING, logger),
        error: makeLogger(LogLevel.ERROR, logger)
    };
    const connectionManager = makeConnectionManager(connection, socketOpts, log);
    return {
        ...initialChain(merge(defaultState<unknown, unknown>(), { connectionManager, log })),
        close: async () => {
            await connectionManager.close();
        },
        connect: async () => {
            await connectionManager.getConnection();
        }
    };
};

const validateConnectionOptions = (connectionOpts: string | ConnectionOptions) => {
    if (typeof connectionOpts === 'string') {
        return;
    }
    const allowedKeys: (keyof ConnectionOptions)[] = ['frameMax', 'heartbeat', 'hostname', 'locale', 'password', 'port', 'protocol', 'username', 'vhost', 'reconnectDelays'];
    for (const key of Object.keys(connectionOpts)) {
        if (!allowedKeys.includes(key as keyof Options.Connect)) {
            throw new InvalidOptionsError(key);
        }
    }
};

export interface ChainFunction<TMessage = unknown> {
    (state: Partial<HaredoChainState<TMessage>>): any;
}

export const initialChain = <TMessage, TReply>(state: Partial<HaredoChainState<TMessage>>): InitialChain<TMessage, TReply> => {
    return {
        queue: addQueue(queueChain)(state),
        exchange: addExchange(exchangeChain)(state)
    } as InitialChain<TMessage, TReply>;
};

const addSetup = (state: Partial<HaredoChainState>) => async () => {
    if (state.skipSetup) {
        return;
    }
    const channel = await state.connectionManager.getChannel();
    let channelIsClosed = false;
    channel.on('close', () => {
        channelIsClosed = true;
    });
    try {
        if (typeof state.queue !== 'undefined') {
            const { preferences, ...queueOpts } = state.queue.getOpts();
            let queueData: Replies.AssertQueue;
            const queueInitialName = state.queue.getName();
            // amq. prefixed queue names are only allowed as server-assigned.
            // In case of reconnection we want to wipe the name and let server
            // assign a new name.
            const queueName = /^amq\./.test(queueInitialName) ? '' : queueInitialName;
            if (preferences?.passive) {
                queueData = await channel.checkQueue(queueName);
            } else {
                queueData = await channel.assertQueue(queueName, queueOpts);
            }
            state.queue.mutateName(queueData.queue);
        }
        if (state.exchange) {
            const { preferences, ...exchangeOpts } = state.exchange.getOpts();
            if (preferences?.passive) {
                await channel.checkExchange(state.exchange.getName());
            } else {
                await channel.assertExchange(state.exchange.getName(), state.exchange.getType(), exchangeOpts);
            }
        }
        if (state.bindings?.length) {
            await promiseMap(state.bindings, async (binding) => {
                const { preferences, ...exchangeOpts } = binding.exchange.getOpts();
                if (preferences?.passive) {
                    await channel.checkExchange(binding.exchange.getName());
                } else {
                    await channel.assertExchange(binding.exchange.getName(), binding.exchange.getType(), exchangeOpts);
                }
                await promiseMap(binding.patterns, async (pattern) => {
                    if (state.queue) {
                        await channel.bindQueue(state.queue.getName(), binding.exchange.getName(), pattern);
                    } else {
                        await channel.bindExchange(state.exchange.getName(), binding.exchange.getName(), pattern);
                    }
                });
            });
        }
    } finally {
        if (!channelIsClosed) {
            await channel.close();
        }
    }
};

export const chainMethods = <TChain extends ChainFunction, TMessage>(chain: TChain) =>
    (state: Partial<HaredoChainState<TMessage>>): GeneralChainMembers<TChain> => ({
        json: addJson(chain)(state),
        setup: addSetup(state),
        confirm: addConfirm(chain)(state)
    });

type ExchangeChainFunction<TMessage, TReply> = (state: Partial<HaredoChainState<TMessage>>) => ExchangeChain<TMessage, TReply>;

export const exchangeChain = <TMessage, TReply>(state: Partial<HaredoChainState<TMessage>>): ExchangeChain<TMessage, TReply> => {
    const bindExchange = addExchangeBinding(exchangeChain as ExchangeChainFunction<TMessage, TReply>)(state);
    return {
        bindExchange,
        getState: () => state,
        ...chainMethods(exchangeChain as ExchangeChainFunction<TMessage, TReply>)(state),
        publish: publishToExchange<TMessage>(state),
        rpc: rpcToExchange<TMessage, TReply>(state),
        skipSetup: (skipSetup = true) => {
            return exchangeChain(merge(state, { skipSetup }));
        },
    };
};

type QueueChainFunction<TMessage, TReply> = (state: Partial<HaredoChainState<TMessage, TReply>>) => QueueChain<TMessage, TReply>;

export const queueChain = <TMessage, TReply>(state: Partial<HaredoChainState<TMessage>>): QueueChain<TMessage, TReply> => {
    const bindExchange = addExchangeBinding(queueChain as QueueChainFunction<TMessage, TReply>)(state);
    return {
        bindExchange,
        ...chainMethods(queueChain as QueueChainFunction<TMessage, TReply>)(state),
        publish: publishToQueue<TMessage>(state),
        rpc: rpcToQueue<TMessage, TReply>(state),
        getState: () => state,
        subscribe: async <TCustomMessage, TCustomReply>(cb: MessageCallback<MergeTypes<TMessage, TCustomMessage>, MergeTypes<TReply, TCustomReply>>) => {
            const consumer = await makeConsumer(cb, state.connectionManager, {
                autoAck: state.autoAck ?? true,
                json: state.json ?? true,
                middleware: state.middleware,
                autoReply: state.autoReply ?? false,
                prefetch: state.prefetch,
                queue: state.queue,
                reestablish: state.reestablish ?? true,
                backoff: state.backoff,
                noAck: state.noAck ?? false,
                priority: state.priority,
                exclusive: state.exclusive ?? false,
                setup: addSetup(state)
            }, state.log);
            state.connectionManager.addConsumer(consumer);
            return consumer;
        },
        autoAck: (autoAck = true) => {
            return queueChain(merge(state, { autoAck }));
        },
        prefetch: (prefetch = 0) => {
            return queueChain(merge(state, { prefetch }));
        },
        concurrency: (prefetch = 0) => {
            return queueChain(merge(state, { prefetch }));
        },
        reestablish: (reestablish = true) => {
            return queueChain(merge(state, { reestablish }));
        },
        autoReply: (autoReply = true) => {
            return queueChain(merge(state, { autoReply }));
        },
        backoff: (backoff: FailureBackoff) => {
            return queueChain(merge(state, { backoff }));
        },
        skipSetup: (skipSetup = true) => {
            return queueChain(merge(state, { skipSetup }));
        },
        use: (...middleware: Middleware<TMessage, TReply>[]) => {
            return queueChain(merge(state, { middleware: (state.middleware || []).concat(middleware) }));
        },
        noAck: (noAck = true) => {
            return queueChain(merge(state, { noAck }));
        },
        priority: (priority: number) => {
            return queueChain(merge(state, { priority }));
        },
        exclusive: (exclusive = true) => {
            return queueChain(merge(state, { exclusive }));
        }
    };
};

export const rpcToQueue = <TMessage, TReply>(state: Partial<HaredoChainState<TMessage, TReply>>) =>
    async (message: TMessage, opts: Options.Publish) => {
        await addSetup(state)();
        const correlationId = generateCorrelationId();
        const { promise, queue } = await state.connectionManager.rpc<TReply>(correlationId);
        const preppedMessage = prepMessage(state, message, undefined, opts)
            .correlationId(correlationId)
            .replyTo(queue)
            .getState();
        await state.connectionManager.publisher.sendToQueue(
            state.queue.getName(),
            Buffer.from(preppedMessage.content),
            preppedMessage.options as ExtendedPublishOptions,
            state.confirm
        );
        return promise;
    };

interface RpcToExchange<TMessage, TReply> {
    /**
     * Send an RPC message to the provided exchange.
     * Unless .json(false) is present in the chain,
     * the message will be passed through JSON.stringify
     */
    (message: TMessage | string, routingKey?: string, options?: Options.Publish): Promise<TReply>;
    /**
     * Send an RPC message to the provided exchange.
     * If you provide a truthy routingKey,
     * it will override the one specified in MessageChain
     */
    (message: MessageChain<TMessage>, routingKey?: string, options?: Options.Publish): Promise<TReply>;
}

export const rpcToExchange = <TMessage, TReply>(state: Partial<HaredoChainState<TMessage, TReply>>): RpcToExchange<TMessage, TReply> =>
    async (message: string | TMessage | MessageChain<TMessage>, routingKey?: string, options: Options.Publish = {}) => {
        await addSetup(state)();
        const correlationId = generateCorrelationId();
        const { promise, queue } = await state.connectionManager.rpc<TReply>(correlationId);
        const preppedMessage = prepMessage(state, message, routingKey, options)
            .correlationId(correlationId)
            .replyTo(queue)
            .getState();
        await state.connectionManager.publisher.publishToExchange(
            state.exchange.getName(),
            preppedMessage.routingKey,
            Buffer.from(preppedMessage.content),
            preppedMessage.options as ExtendedPublishOptions,
            state.confirm
        );
        return promise;
    };

const prepMessage = <TMessage, TReply>(
    state: Partial<HaredoChainState<TMessage, TReply>>,
    message: string | TMessage | MessageChain<TMessage>,
    routingKey?: string,
    options: Options.Publish = {}
): MessageChain<TMessage> => {
    if (!isHaredoPreparedMessage(message)) {
        if (state.json) {
            message = preparedMessage({}).json(message);
        } else {
            message = preparedMessage({}).rawContent(message as string);
        }
    }
    if (routingKey) {
        message = message.routingKey(routingKey);
    }
    message = preparedMessage(mergeMessageState(message.getState(), { options }));
    return message;
};

export const publishToQueue = <TMessage>(state: Partial<HaredoChainState<TMessage>>) =>
    async (message: TMessage | MessageChain<TMessage>, options: Options.Publish = {}) => {
        const preppedMessage = prepMessage(state, message, undefined, options).getState();
        await addSetup(state)();
        return state.connectionManager.publisher.sendToQueue(
            state.queue.getName(),
            Buffer.from(preppedMessage.content),
            preppedMessage.options as ExtendedPublishOptions,
            state.confirm
        );
    };

interface PublishToExchange<TMessage> {
    /**
     * Publish a message to the exchange.
     * Unless the chain contains .json(false),
     * the message will be passed through JSON.stringify
     */
    (message: TMessage | string, routingKey?: string, options?: Options.Publish): Promise<void>;
    /**
     * Publish a message to the exchange.
     * If you provide a truthy routingKey,
     * it will override the one specified in MessageChain
     */
    (message: MessageChain<TMessage>, routingKey?: string, options?: Options.Publish): Promise<void>;
}

export const publishToExchange = <TMessage>(state: Partial<HaredoChainState<TMessage>>): PublishToExchange<TMessage> =>
    async (message: TMessage | MessageChain<TMessage> | string, routingKey?: string, options?: Options.Publish) => {
        const preppedMessage = prepMessage(state, message, routingKey, options).getState();
        await addSetup(state)();
        return state.connectionManager.publisher.publishToExchange(
            state.exchange.getName(),
            preppedMessage.routingKey,
            Buffer.from(preppedMessage.content),
            preppedMessage.options as ExtendedPublishOptions,
            state.confirm
        );
    };

export const addQueue = <T extends ChainFunction>(chain: T) =>
    (state: Partial<HaredoChainState>) =>
        (queue: string | Queue, opts: Options.AssertQueue = {}) => {
            if (typeof queue === 'string') {
                queue = makeQueueConfig(queue, opts);
            }
            return chain(merge(state, { queue }));
        };

export const addExchange = <T extends ChainFunction>(chain: T) =>
    (state: Partial<HaredoChainState>) =>
        (exchange: Exchange | string, type: ExchangeType, opts: Partial<ExchangeOptions> = {}) => {
            if (typeof exchange === 'string') {
                exchange = makeExchangeConfig(exchange, type, opts);
            }
            return chain(merge(state, { exchange }));
        };

export const addExchangeBinding = <TMessage, TChain extends ChainFunction<TMessage>, TCustom, TCustomChain extends ChainFunction<TCustom>>(chain: TChain) =>
    (state: Partial<HaredoChainState<TMessage>>) =>
        <TCustom>(
            exchange: Exchange<TCustom> | string,
            pattern: string | string[],
            type?: ExchangeType,
            opts: Partial<ExchangeOptions> = {}
        ) => {
            if (typeof exchange === 'string') {
                exchange = makeExchangeConfig(exchange, type, opts);
            }
            return chain(merge(state, { bindings: (state.bindings || [])
                .concat({ exchange, patterns: [].concat(pattern) }) })) as ReturnType<TChain> | ReturnType<TCustomChain>;
        };

const addConfirm = <T extends ChainFunction>(chain: T) =>
    (state: Partial<HaredoChainState>) =>
        (confirm = true) =>
            chain(merge(state, { confirm })) as ReturnType<T>;

export const addJson = <T extends ChainFunction>(chain: T) =>
    (state: Partial<HaredoChainState>) =>
        (json = true) =>
            chain(merge(state, { json })) as ReturnType<T>;

interface GeneralChainMembers<TChain extends ChainFunction> {
    /**
     * Enable publishing using ConfirmChannels
     *
     * See [RabbitMq Docs](https://www.rabbitmq.com/confirms.html)
     *
     * @param confirm defaults to true
     */
    confirm(confirm?: boolean): ReturnType<TChain>;
    /**
     * Enable json mode (it's enabled by default).
     * When json is enabled, messages that are published without using prepared message objects
     * will be passed through JSON.stringify. When subscribing message data will
     * be run through JSON.parse
     *
     * @param json defaults to true
     */
    json(json?: boolean): ReturnType<TChain>;
    /**
     * Assert / Bind exchanges/queues. Will be skipped if skipSetup is set in the chain
     */
    setup(): Promise<void>;
}

export interface QueuePublishMethod<TMessage = unknown, TReply = unknown> {
    publish(message: TMessage | MessageChain<TMessage> | string, publishOpts?: Options.Publish): Promise<void>;
    rpc(message: TMessage | MessageChain<TMessage> | string, publishOpts?: Options.Publish): Promise<TReply>;
}

export interface ExchangePublishMethod<TMessage = unknown, TReply = unknown> {
    publish: PublishToExchange<TMessage>;
    rpc: RpcToExchange<TMessage, TReply>;
}

export interface InitialChain<TMessage, TReply> {

    /**
     * Create a queue based chain
     */
    queue<TCustomMessage = unknown, TCustomReply = unknown>(
        queue: Queue<TCustomMessage, TCustomReply>
    ): QueueChain<MergeTypes<TMessage, TCustomMessage>, MergeTypes<TReply, TCustomReply>>;
    /**
     * Create a queue based chain
     * @param queue name of the queue
     * @param opts optional parameters to pass to [amqplib#AssertQueue](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue)
     */
    queue<TCustomMessage = unknown, TCustomReply = unknown>(
        queue: string,
        opts?: Options.AssertQueue
    ): QueueChain<MergeTypes<TMessage, TCustomMessage>, MergeTypes<TReply, TCustomReply>>;

    /**
    * Create an exchange based chain
    *
    * @param exchange instance of Exchange
    */
    exchange<TCustomMessage = unknown, TCustomReply = unknown>(
        exchange: Exchange<TCustomMessage>
    ): ExchangeChain<MergeTypes<TMessage, TCustomMessage>, MergeTypes<TReply, TCustomReply>>;
    /**
     * Add an exchange to the chain.
     *
     * @param exchange name of the exchange
     * @param type exchange type, defaults to Direct
     * @param opts exchange options that will be passed to amqplib while asserting
     * [amqplib#assertExchange](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertExchange)
     */
    exchange<TCustomMessage = unknown, TCustomReply = unknown>(
        exchange: string,
        type: ExchangeType | StandardExchangeType,
        opts?: Partial<ExchangeOptions>
    ): ExchangeChain<MergeTypes<TMessage, TCustomMessage>, MergeTypes<TReply, TCustomReply>>;

}

export interface ExchangeChain<TMessage, TReply> extends
    GeneralChainMembers<(state: HaredoChainState<TMessage>) => ExchangeChain<TMessage, TReply>>,
    ExchangePublishMethod<TMessage, TReply> {

    /**
     * Return the state of the chain for inspection
     */
    getState(): Partial<HaredoChainState<TMessage, TReply>>;

    /**
     * Bind an exchange to the main exchange.
     * See [Exchange to Exchange bindings](https://www.rabbitmq.com/e2e.html)
     *
     * For patterns there are two wildcards:
     * * `*` - one word
     * * `#` - zero or more words
     * A word is dot(period) delimited
     *
     * @param exchange Exchange to bind
     * @param pattern Pattern(s) to use
     */
    bindExchange<TCustomMessage = unknown, TCustomReply = unknown>(
        exchange: Exchange<TCustomMessage>,
        pattern: string | string[]
    ): ExchangeChain<MergeTypes<TMessage, TCustomMessage>, MergeTypes<TReply, TCustomReply>>;
    /**
     * Assert and bind an exchange to the main exchange.
     * See [Exchange to Exchange bindings](https://www.rabbitmq.com/e2e.html)
     *
     * For patterns there are two wildcards:
     * * `*` - one word
     * * `#` - zero or more words
     * A word is dot(period) delimited
     *
     * @param exchangeName name of the exchange to forward messages from
     * @param pattern pattern(s) to bind
     * @param exchangeType type of the exchange
     * @param exchangeOpts extra options for asserting the exchange
     */
    bindExchange(
        exchangeName: string,
        pattern: string | string[],
        exchangeType: ExchangeType,
        exchangeOpts?: ExchangeOptions
    ): ExchangeChain<TMessage, TReply>;
    /**
     * Bind an exchange to the main exchange.
     *
     * For patterns there are two wildcards:
     * * `*` - one word
     * * `#` - zero or more words
     * A word is dot(period) delimited
     *
     * @param exchange Name of the exchange to bind
     * @param pattern Pattern(s) to use
     * @param type Type of the exchange
     * @param opts Options to pass to amqplib for asserting
     */
    bindExchange<TCustomMessage = unknown, TCustomReply = unknown>(
        exchange: string,
        pattern: string | string[],
        type: ExchangeType,
        opts?: Partial<ExchangeOptions>): ExchangeChain<MergeTypes<TMessage, TCustomMessage>, MergeTypes<TReply, TCustomReply>>;

    /**
     * Don't run automatic setup. Useful for faster publishing.
     *
     * @param skipSetup defaults to true
     */
    skipSetup(skipSetup?: boolean): ExchangeChain<TMessage, TReply>;
}

export interface QueueChain<TMessage, TReply> extends
    GeneralChainMembers<(state: HaredoChainState<TMessage, TReply>) => QueueChain<TMessage, TReply>>,
    QueuePublishMethod<TMessage, TReply> {

    /**
     * Return the state of the chain for inspection
     */
    getState(): Partial<HaredoChainState<TMessage>>;

    /**
     * Bind an exchange to the queue.
     *
     * For patterns there are two wildcards:
     * * `*` - one word
     * * `#` - zero or more words
     * A word is dot(period) delimited
     *
     * @param exchange Exchange to bind
     * @param pattern Pattern(s) to use
     */
    bindExchange<TCustomMessage = unknown, TCustomReply = unknown>(
        exchange: Exchange<TCustomMessage>,
        pattern: string | string[]
    ): QueueChain<MergeTypes<TMessage, TCustomMessage>, MergeTypes<TReply, TCustomReply>>;
    /**
     * Bind an exchange to the queue.
     *
     * For patterns there are two wildcards:
     * * `*` - one word
     * * `#` - zero or more words
     * A word is dot(period) delimited
     *
     * @param exchangeName name of the exchange
     * @param pattern pattern(s) to bind
     * @param exchangeType Type of the exchange
     * @param exchangeOpts Options to use for asserting the exchange
     */
    bindExchange(
        exchangeName: string,
        pattern: string | string[],
        exchangeType: ExchangeType,
        exchangeOpts?: ExchangeOptions
    ): QueueChain<TMessage, TReply>;
    /**
     * Bind an exchange to the queue.
     *
     * For patterns there are two wildcards:
     * * `*` - one word
     * * `#` - zero or more words
     * A word is dot(period) delimited
     *
     * @param exchange Name of the exchange to bind
     * @param pattern Pattern(s) to use
     * @param type Type of the exchange
     * @param opts Options to pass to amqplib for asserting
     */
    bindExchange<TCustomMessage = unknown, TCustomReply = unknown>(
        exchange: string,
        pattern: string | string[],
        type: ExchangeType,
        opts?: Partial<ExchangeOptions>): QueueChain<MergeTypes<TMessage, TCustomMessage>, MergeTypes<TReply, TCustomReply>>;

    /**
     * Enable noAck on the consumer. When noAck is set the broker will dequeue
     * messages when they are sent down the wire.
     *
     * @param noAck defaults to true
     */
    noAck(noAck?: boolean): QueueChain<TMessage, TReply>;
    /**
     * Set the consumer priority. Lower priority consumers will receive messages only when higher
     * priority consumers are busy.
     *
     * Requires [Consumer priorities](https://www.rabbitmq.com/consumer-priority.html) extension to be enabled
     */
    priority(priority: number): QueueChain<TMessage, TReply>;
    /**
     * When exclusive is set to true, the broker won't allow anyone else consume from this queue
     * @param exclusive defaults to true
     */
    exclusive(exclusive?: boolean): QueueChain<TMessage, TReply>;
    /**
     * Autoack (enabled by default) automatically acks/nacks messages when
     * subscriber callback throws an error or the promise returned from it
     * gets rejected.
     *
     * @param autoAck defaults to true
     */
    autoAck(autoAck?: boolean): QueueChain<TMessage, TReply>;
    /**
     * Set prefetch count for consuming (ie. amount of messages that will be received in parallel)
     * 0 Means there is no limit.
     *
     * Aliased to .concurrency
     *
     * @param prefetch number of messages to prefetch
     */
    prefetch(prefetch: number): QueueChain<TMessage, TReply>;
    /**
     * Set prefetch count for consuming (ie. amount of messages that will be received in parallel)
     * 0 Means there is no limit.
     *
     * Aliased to .prefetch
     *
     * @param concurrency number of concurrent messages passed to .subscribe callbacks
     */
    concurrency(concurrency: number): QueueChain<TMessage, TReply>;
    /**
     * Reestablish a subscriber when channel / connection closes (enabled by default)
     *
     * @param reestablish defaults to true
     */
    reestablish(reestablish?: boolean): QueueChain<TMessage, TReply>;
    /**
     * Subscribe to messages in the queue specified in the chain
     */
    subscribe<TCustomMessage, TCustomReply>(cb: MessageCallback<MergeTypes<TMessage, TCustomMessage>, MergeTypes<TReply, TCustomReply>>): Promise<Consumer>;
    /**
     * Autoreply (enabled by default) automatically replies to messages
     * where message callback in subscriber returns a non-undefined value
     * (Only if message has replyTo and a correlationId)
     *
     * [RPC tutorial](https://www.rabbitmq.com/tutorials/tutorial-six-javascript.html)
     *
     * @param autoReply defaults to true
     */
    autoReply(autoReply?: boolean): QueueChain<TMessage, TReply>;
    /**
     * Provide a failurebackoff to control the rate of messages in case of errors.
     * Bundled together with haredo comes standardBackoff
     */
    backoff(backoff: FailureBackoff): QueueChain<TMessage, TReply>;
    /**
     * Don't run automatic setup. Useful for faster publishing.
     *
     * @param skipSetup defaults to true
     */
    skipSetup(skipSetup?: boolean): QueueChain<TMessage, TReply>;
    /**
     * Add middleware to the subscription
     */
    use(middleware: Middleware<TMessage, TReply> | Middleware<TMessage, TReply>[]): QueueChain<TMessage, TReply>;
}
