import { Options } from 'amqplib';
import { Queue } from './queue';
import { Exchange, xDelayedTypeStrings, ExchangeType, ExchangeOptions, exchangeTypeStrings } from './exchange';

import { HaredoChainState } from './state';
import { MergeTypes, promiseMap, merge } from './utils';
import { makeConnectionManager } from './connection-manager';
import { MessageCallback, Consumer, makeConsumer } from './consumer';

export interface HaredoOptions {
    connection?: Options.Connect | string;
    socketOpts?: any;
}

export interface Haredo extends InitialChain<unknown> {
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

export const initialChain = <TMessage>(state: Partial<HaredoChainState<TMessage>>): InitialChain<TMessage> => {
    return {
        queue: addQueue(queueChain)(state),
        exchange: addExchange(exchangeChain)(state)
    } as InitialChain<TMessage>;
};

const addSetup = (state: Partial<HaredoChainState>) => async () => {
    const channel = await state.connectionManager.getChannel();
    try {
        if (state.queue) {
            await channel.assertQueue(state.queue.name, state.queue.opts);
        }
        if (state.exchange) {
            await channel.assertExchange(state.exchange.name, state.exchange.type, state.exchange.opts);
        }
        if (state.bindings) {
            await promiseMap(state.bindings, async (binding) => {
                await promiseMap(binding.patterns, async (pattern) => {
                    await channel.bindQueue(state.queue.name, binding.exchange.name, pattern);
                });
            });
        }
    } finally {
        await channel.close();
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

type ExchangeChainFunction<TMessage> = (state: Partial<HaredoChainState<TMessage>>) => ExchangeChain<TMessage>;

export const exchangeChain = <TMessage>(state: Partial<HaredoChainState<TMessage>>): ExchangeChain<TMessage> => {
    const bindExchange = addExchangeBinding(exchangeChain as ExchangeChainFunction<TMessage>)(state);
    return {
        bindExchange,
        ...chainMethods(exchangeChain as ExchangeChainFunction<TMessage>)(state),
        publish: publishToExchange<TMessage>(state),
    };
};

type QueueChainFunction<TMessage> = (state: Partial<HaredoChainState<TMessage>>) => QueueChain<TMessage>;

export const queueChain = <TMessage>(state: Partial<HaredoChainState<TMessage>>): QueueChain<TMessage> => {
    const bindExchange = addExchangeBinding(queueChain as QueueChainFunction<TMessage>)(state);
    return {
        bindExchange,
        ...chainMethods(queueChain as QueueChainFunction<TMessage>)(state),
        publish: publishToQueue<TMessage>(state),
        subscribe: async <TCustom>(cb: MessageCallback<MergeTypes<TMessage, TCustom>, unknown>) => {
            await addSetup(state)();
            return makeConsumer(state.connectionManager, {
                autoAck: state.autoReply,
                json: state.json,
                middleware: state.middleware,
                autoReply: state.autoReply,
                prefetch: state.prefetch,
                queue: state.queue,
                reestablish: state.reestablish,
                setup: addSetup(state)
            });
        }
    };
};

export const publishToQueue = <TMessage>(state: Partial<HaredoChainState<TMessage>>) =>
    async (message: TMessage, opts: Options.Publish) => {
        const channel = await state.connectionManager.getChannel();
        await addSetup(state)();
        return channel.sendToQueue(state.queue.name, Buffer.from(JSON.stringify(message)));
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
    // autoAck(autoAck: boolean): T;
    // autoReply(autoReply: boolean): T;
    // confirm(confirm: boolean): T;
    // failSpan(failSpan: number): T;
    // failThreshold(failThreshold: number): T;
    // failTimeout(failTimeout: number): T;
    json(json: boolean): ReturnType<TChain>;
    setup(): Promise<void>;
    // prefetch(prefetch: number): T;
    // reestablish(reestablish: boolean): T;
    // skipSetup(skipSetup: boolean): T;
    // use(middleware: Middleware<T> | Middleware<T>[]): T;
}

export interface QueuePublishMethod<TMessage = unknown> {
    publish(message: TMessage, publishOpts?: Options.Publish): Promise<boolean>;
}

export interface ExchangePublishMethod<TMessage = unknown> {
    publish(message: TMessage, routingKey: string): Promise<boolean>;
}

export interface InitialChain<TMessage> {

    /**
     * Create a queue based chain
     */
    queue<TCustom = unknown>(queue: Queue<TCustom>): QueueChain<MergeTypes<TMessage, TCustom>>;
    /**
     * Create a queue based chain
     * @param queue name of the queue
     * @param opts optional parameters to pass to [amqplib#AssertQueue](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue)
     */
    queue<TCustom = unknown>(queue: string, opts?: Options.AssertQueue): QueueChain<MergeTypes<TMessage, TCustom>>;

    /**
    * Create an exchange based chain
    *
    * @param exchange instance of Exchange
    */
    exchange<TCustom = unknown>(exchange: Exchange<TCustom>): ExchangeChain<MergeTypes<TMessage, TCustom>>;
    /**
     * Add an exchange to the chain.
     *
     * @param exchange name of the exchange
     * @param type exchange type, defaults to Direct
     * @param opts exchange options that will be passed to amqplib while asserting
     * [amqplib#assertExchange](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertExchange)
     */
    exchange<TCustom = unknown>(
        exchange: string,
        type?: ExchangeType | xDelayedTypeStrings,
        opts?: Partial<ExchangeOptions>
    ): ExchangeChain<MergeTypes<TMessage, TCustom>>;

}

export interface ExchangeChain<TMessage> extends
    GeneralChainMembers<(state: HaredoChainState<TMessage>) => ExchangeChain<TMessage>>,
    ExchangePublishMethod<TMessage> {

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
    bindExchange<TCustom = unknown>(
        exchange: Exchange<TCustom>,
        pattern: string | string[]
    ): ExchangeChain<MergeTypes<TMessage, TCustom>>;
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
    bindExchange<TCustom = unknown>(
        exchange: string,
        pattern: string | string[],
        type: ExchangeType | exchangeTypeStrings,
        opts?: Partial<ExchangeOptions>): ExchangeChain<MergeTypes<TMessage, TCustom>>;

}

export interface QueueChain<TMessage> extends
    GeneralChainMembers<(state: HaredoChainState<TMessage>) => QueueChain<TMessage>>,
    QueuePublishMethod<TMessage> {

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
    bindExchange<TCustom = unknown>(
        exchange: Exchange<TCustom>,
        pattern: string | string[]
    ): QueueChain<MergeTypes<TMessage, TCustom>>;
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
    bindExchange<TCustom = unknown>(
        exchange: string,
        pattern: string | string[],
        type: ExchangeType | exchangeTypeStrings,
        opts?: Partial<ExchangeOptions>): QueueChain<MergeTypes<TMessage, TCustom>>;

    subscribe<TCustom>(cb: MessageCallback<MergeTypes<TMessage, TCustom>>): Promise<Consumer>;
}
