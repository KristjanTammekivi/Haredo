import { Options } from 'amqplib';
import { Queue } from './queue';
import { Exchange, xDelayedTypeStrings, ExchangeType, ExchangeOptions, exchangeTypeStrings } from './exchange';

import { HaredoChainState, Middleware } from './state';
import { MergeTypes, promiseMap, merge } from './utils';
import { makeConnectionManager } from './connection-manager';
import { MessageCallback, Consumer, makeConsumer } from './consumer';

export interface HaredoOptions {
    connection?: Options.Connect | string;
    socketOpts?: any;
}

export interface Haredo extends InitialChain<unknown, unknown> {
    close: () => Promise<void>;
}

export const haredo = (opts: HaredoOptions) => {
    const connectionManager = makeConnectionManager(opts.connection, opts.socketOpts);
    return {
        ...initialChain({ connectionManager }),
        close: async () => {
            await connectionManager.close();
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
    const channel = await state.connectionManager.getChannel();
    let channelIsClosed = false;
    channel.on('close', () => {
        channelIsClosed = true;
    });
    try {
        if (state.queue) {
            await channel.assertQueue(state.queue.name, state.queue.opts);
        }
        if (state.exchange) {
            await channel.assertExchange(state.exchange.name, state.exchange.type, state.exchange.opts);
        }
        if (state.bindings) {
            await promiseMap(state.bindings, async (binding) => {
                await channel.assertExchange(binding.exchange.name, binding.exchange.type, binding.exchange.opts);
                await promiseMap(binding.patterns, async (pattern) => {
                    await channel.bindQueue(state.queue.name, binding.exchange.name, pattern);
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
    (state: Partial<HaredoChainState<TMessage>>): GeneralChainMembers<TChain> => {
        const json = addJson(chain)(state);
        return {
            json,
            setup: addSetup(state)
        };
    };

type ExchangeChainFunction<TMessage, TReply> = (state: Partial<HaredoChainState<TMessage>>) => ExchangeChain<TMessage, TReply>;

export const exchangeChain = <TMessage, TReply>(state: Partial<HaredoChainState<TMessage>>): ExchangeChain<TMessage, TReply> => {
    const bindExchange = addExchangeBinding(exchangeChain as ExchangeChainFunction<TMessage, TReply>)(state);
    return {
        bindExchange,
        getState: () => state,
        ...chainMethods(exchangeChain as ExchangeChainFunction<TMessage, TReply>)(state),
        publish: publishToExchange<TMessage>(state),
    };
};

type QueueChainFunction<TMessage, TReply> = (state: Partial<HaredoChainState<TMessage, TReply>>) => QueueChain<TMessage, TReply>;

export const queueChain = <TMessage, TReply>(state: Partial<HaredoChainState<TMessage>>): QueueChain<TMessage, TReply> => {
    const bindExchange = addExchangeBinding(queueChain as QueueChainFunction<TMessage, TReply>)(state);
    return {
        bindExchange,
        ...chainMethods(queueChain as QueueChainFunction<TMessage, TReply>)(state),
        publish: publishToQueue<TMessage>(state),
        getState: () => state,
        subscribe: async <TCustom>(cb: MessageCallback<MergeTypes<TMessage, TCustom>, unknown>) => {
            await addSetup(state)();
            return makeConsumer(cb, state.connectionManager, {
                autoAck: state.autoReply,
                json: state.json,
                middleware: state.middleware,
                autoReply: state.autoReply,
                prefetch: state.prefetch,
                queue: state.queue,
                reestablish: state.reestablish,
                setup: addSetup(state)
            });
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
        skipSetup: (skipSetup = false) => {
            return queueChain(merge(state, { skipSetup }));
        },
        use: (...middleware: Middleware<TMessage, TReply>[]) => {
            return queueChain(merge(state, { middleware: (state.middleware || []).concat(middleware) }));
        }
    };
};

export const publishToQueue = <TMessage>(state: Partial<HaredoChainState<TMessage>>) =>
    async (message: TMessage, opts: Options.Publish) => {
        const channel = await state.connectionManager.getChannel();
        await addSetup(state)();
        return channel.sendToQueue(state.queue.name, Buffer.from(JSON.stringify(message)), opts);
    };

export const publishToExchange = <TMessage>(state: Partial<HaredoChainState<TMessage>>) =>
    async (message: TMessage, routingKey?: string, opts?: Options.Publish) => {
        const channel = await state.connectionManager.getChannel();
        await addSetup(state)();
        return channel.publish(state.exchange.name, routingKey, Buffer.from(JSON.stringify(message)), opts);
    };

export const addQueue = <T extends ChainFunction>(chain: T) =>
    (state: Partial<HaredoChainState>) =>
        (queue: string | Queue, opts: Options.AssertQueue = {}) => {
            if (typeof queue === 'string') {
                queue = new Queue(queue, opts);
            }
            return chain(merge(state, { queue }));
        };

export const addExchange = <T extends ChainFunction>(chain: T) =>
    (state: Partial<HaredoChainState>) =>
        (exchange: Exchange | string, type: ExchangeType | exchangeTypeStrings, opts: Partial<ExchangeOptions> = {}) => {
            if (typeof exchange === 'string') {
                exchange = new Exchange(exchange, type, opts);
            }
            return chain(merge(state, { exchange }));
        };

export const addExchangeBinding = <TMessage, TChain extends ChainFunction<TMessage>, TCustom, TCustomChain extends ChainFunction<TCustom>>(chain: TChain) =>
    (state: Partial<HaredoChainState<TMessage>>) =>
        <TCustom>(
            exchange: Exchange<TCustom> | string,
            pattern: string | string[],
            type?: ExchangeType | exchangeTypeStrings,
            opts: Partial<ExchangeOptions> = {}
        ) => {
            if (typeof exchange === 'string') {
                exchange = new Exchange(exchange, type, opts);
            }
            return chain(merge(state, { bindings: [{ exchange, patterns: [].concat(pattern) }] })) as ReturnType<TChain> | ReturnType<TCustomChain>;
        };

export const addJson = <T extends ChainFunction>(chain: T) =>
    (state: Partial<HaredoChainState>) =>
        (json = true) =>
            chain(merge(state, { json })) as ReturnType<T>;

interface GeneralChainMembers<TChain extends ChainFunction> {
    // confirm(confirm: boolean): T;
    json(json: boolean): ReturnType<TChain>;
    setup(): Promise<void>;
}

export interface QueuePublishMethod<TMessage = unknown> {
    publish(message: TMessage, publishOpts?: Options.Publish): Promise<boolean>;
}

export interface ExchangePublishMethod<TMessage = unknown> {
    publish(message: TMessage, routingKey: string): Promise<boolean>;
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
        type?: ExchangeType | xDelayedTypeStrings,
        opts?: Partial<ExchangeOptions>
    ): ExchangeChain<MergeTypes<TMessage, TCustomMessage>, MergeTypes<TReply, TCustomReply>>;

}

export interface ExchangeChain<TMessage, TReply> extends
    GeneralChainMembers<(state: HaredoChainState<TMessage>) => ExchangeChain<TMessage, TReply>>,
    ExchangePublishMethod<TMessage> {

    getState(): Partial<HaredoChainState<TMessage>>;

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
        type: ExchangeType | exchangeTypeStrings,
        opts?: Partial<ExchangeOptions>): ExchangeChain<MergeTypes<TMessage, TCustomMessage>, MergeTypes<TReply, TCustomReply>>;

}

export interface QueueChain<TMessage, TReply> extends
    GeneralChainMembers<(state: HaredoChainState<TMessage, TReply>) => QueueChain<TMessage, TReply>>,
    QueuePublishMethod<TMessage> {

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
     * @param exchange Name of the exchange to bind
     * @param pattern Pattern(s) to use
     * @param type Type of the exchange
     * @param opts Options to pass to amqplib for asserting
     */
    bindExchange<TCustomMessage = unknown, TCustomReply = unknown>(
        exchange: string,
        pattern: string | string[],
        type: ExchangeType | exchangeTypeStrings,
        opts?: Partial<ExchangeOptions>): QueueChain<MergeTypes<TMessage, TCustomMessage>, MergeTypes<TReply, TCustomReply>>;

    autoAck(autoAck: boolean): QueueChain<TMessage, TReply>;
    prefetch(prefetch: number): QueueChain<TMessage, TReply>;
    reestablish(reestablish: boolean): QueueChain<TMessage, TReply>;
    subscribe<TCustom>(cb: MessageCallback<MergeTypes<TMessage, TCustom>>): Promise<Consumer>;
    autoReply(autoReply: boolean): QueueChain<TMessage, TReply>;
    failSpan(failSpan: number): QueueChain<TMessage, TReply>;
    failThreshold(failThreshold: number): QueueChain<TMessage, TReply>;
    failTimeout(failTimeout: number): QueueChain<TMessage, TReply>;
    skipSetup(skipSetup: boolean): QueueChain<TMessage, TReply>;
    use(middleware: Middleware<TMessage, TReply> | Middleware<TMessage, TReply>[]): QueueChain<TMessage, TReply>;
}
