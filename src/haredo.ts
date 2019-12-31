import { Options } from 'amqplib';
import { Queue, makeQueueConfig } from './queue';
import { Exchange, StandardExchangeType, ExchangeType, ExchangeOptions, makeExchangeConfig } from './exchange';

import { HaredoChainState, Middleware, defaultState, Loggers } from './state';
import { MergeTypes, promiseMap, merge, omit } from './utils';
import { makeConnectionManager } from './connection-manager';
import { MessageCallback, Consumer, makeConsumer } from './consumer';
import { MessageChain, isMessageChain, preparedMessage, mergeMessageState, ExtendedPublishOptions } from './prepared-message';
import { generateCorrelationId } from './rpc';

// TODO: make this file smaller
// TODO: add a configuration option for max connection attempts

export interface LogItem {
    level: LogLevel;
    component: string;
    msg: any[];
    timestamp: Date;
}

export interface HaredoOptions {
    connection?: Options.Connect | string;
    socketOpts?: any;
    logger?: (log: LogItem) => void;
}

export enum LogLevel {
    'DEBUG' = 'DEBUG',
    'INFO' = 'INFO',
    'WARNING' = 'WARNING',
    'ERROR' = 'ERROR'
}

export interface Haredo extends InitialChain<unknown, unknown> {
    close: () => Promise<void>;
    connect: () => Promise<void>;
}

export const haredo = ({ connection, socketOpts, logger = () => {} }: HaredoOptions): Haredo => {
    const log: Loggers = {
        debug: (component: string, ...args: any[]) => logger({ component, level: LogLevel.DEBUG, msg: args, timestamp: new Date() }),
        info: (component: string, ...args: any[]) => logger({ component, level: LogLevel.INFO, msg: args, timestamp: new Date() }),
        warning: (component: string, ...args: any[]) => logger({ component, level: LogLevel.WARNING, msg: args, timestamp: new Date() }),
        error: (component: string, ...args: any[]) => logger({ component, level: LogLevel.ERROR, msg: args, timestamp: new Date() })
    };
    const connectionManager = makeConnectionManager(connection, socketOpts, log);
    return {
        ...initialChain(merge(defaultState<unknown, unknown>({}), { connectionManager, log })),
        close: async () => {
            await connectionManager.close();
        },
        connect: async () => {
            await connectionManager.getConnection();
        }
    };
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
            const queueData = await channel.assertQueue(state.queue.getName(), omit(state.queue.getOpts()));
            state.queue.mutateName(queueData.queue);
        }
        if (state.exchange) {
            await channel.assertExchange(state.exchange.getName(), state.exchange.getType(), state.exchange.getOpts());
        }
        if (state.bindings) {
            await promiseMap(state.bindings, async (binding) => {
                await channel.assertExchange(binding.exchange.getName(), binding.exchange.getType(), binding.exchange.getOpts());
                await promiseMap(binding.patterns, async (pattern) => {
                    await channel.bindQueue(state.queue.getName(), binding.exchange.getName(), pattern);
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
        subscribe: async <TCustom>(cb: MessageCallback<MergeTypes<TMessage, TCustom>, unknown>) => {
            const consumer = await makeConsumer(cb, state.connectionManager, {
                autoAck: state.autoAck ?? true,
                json: state.json ?? true,
                middleware: state.middleware,
                autoReply: state.autoReply ?? false,
                prefetch: state.prefetch,
                queue: state.queue,
                reestablish: state.reestablish ?? true,
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
        reestablish: (reestablish = true) => {
            return queueChain(merge(state, { reestablish }));
        },
        autoReply: (autoReply = true) => {
            return queueChain(merge(state, { autoReply }));
        },
        failSpan: (failSpan = 5000) => {
            return queueChain(merge(state, { failSpan }));
        },
        failThreshold: (failThreshold = Infinity) => {
            return queueChain(merge(state, { failThreshold }));
        },
        failTimeout: (failTimeout = 5000) => {
            return queueChain(merge(state, { failTimeout }));
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
        const { promise, queue } = await state.connectionManager.rpc(correlationId);
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
        return  promise;
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
    if (!isMessageChain(message)) {
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
    publish(message: TMessage | MessageChain<TMessage> | string, routingKey: string, publishOpts?: Options.Publish): Promise<void>;
    rpc(message: TMessage | MessageChain<TMessage> | string, routingKey: string, publishOpts?: Options.Publish): Promise<TReply>;
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
    ExchangePublishMethod<TMessage> {

    /**
     * Return the state of the chain for inspection
     */
    getState(): Partial<HaredoChainState<TMessage, TReply>>;

    /**
     * Bind an exchange to the main exchange.
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
    QueuePublishMethod<TMessage> {

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
     * 0 Means there is no limit
     *
     * @param prefetch number of messages to prefetch
     */
    prefetch(prefetch: number): QueueChain<TMessage, TReply>;
    /**
     * Reestablish a subscriber when channel / connection closes (enabled by default)
     *
     * @param reestablish defaults to true
     */
    reestablish(reestablish?: boolean): QueueChain<TMessage, TReply>;
    /**
     * Subscribe to messages in the queue specified in the chain
     */
    subscribe<TCustom>(cb: MessageCallback<MergeTypes<TMessage, TCustom>>): Promise<Consumer>;
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
     * Set the failSpan, the amount of time in milliseconds during which {failThreshold}
     * amount of nacked messages can happen before the subscriber waits {failTimeout}
     * milliseconds until passing the next message to subscriber callback.
     *
     * @param failSpan defaults to 5000
     */
    failSpan(failSpan: number): QueueChain<TMessage, TReply>;
    /**
     * Set the amount of fails the system will allow in {failSpan} milliseconds
     * before the subscriber waits for {failTimeout} milliseconds until passing
     * the next message to subscriber callback
     *
     * @param failThreshold  defaults to Infinity
     */
    failThreshold(failThreshold: number): QueueChain<TMessage, TReply>;
    /**
     * Set the failTimeout, the amount of time in milliseconds to wait until
     * passing the next message to subscriber callback after {failThreshold}
     * amount of nacked messages happen within {failSpan
     *
     * @param failTimeout defaults to 5000
     */
    failTimeout(failTimeout: number): QueueChain<TMessage, TReply>;
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
