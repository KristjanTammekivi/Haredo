import { Options } from 'amqplib';
import { Queue } from './queue';
import { Exchange, xDelayedTypeStrings, ExchangeType, ExchangeOptions, exchangeTypeStrings } from './exchange';

import { HaredoChainState } from './state';
import { MergeTypes } from './utils';
import { makeConnectionManager, ConnectionManager } from './connection-manager';

export interface HaredoOptions {
    connection?: Options.Connect | string;
    socketOpts?: any;
}

export const haredo = (opts: HaredoOptions) => {
    const connectionManager = makeConnectionManager(opts.connection, opts.socketOpts);
    return {
        ...fullChain({ connectionManager }),
        close: () => {
            //
        }
    };
};

export interface ChainFunction {
    (state: Partial<HaredoChainState>): any;
}

export const fullChain = <TMessage>(state: Partial<HaredoChainState<TMessage>>): FullChain<TMessage> => {
    return {
        queue: addQueue(queueChain)(state),
        exchange: addExchange(fullChain)(state),
        json: addJson(fullChain)(state)
    } as FullChain<TMessage>;
};

export const queueChain = <TMessage>(state: Partial<HaredoChainState<TMessage>>): QueueChain<TMessage> => {
    return {
        bindExchange: addExchangeBinding(queueChain)(state),
        json: addJson(queueChain)(state),
        publish: publishToQueue<TMessage>(state)
    } as QueueChain<TMessage>;
};

export const publishToQueue = <TMessage>(state: Partial<HaredoChainState<TMessage>>) =>
    async (message: TMessage, opts: Options.Publish) => {
        const channel = await state.connectionManager.getChannel();
        return channel.sendToQueue(state.queue.name, Buffer.from(JSON.stringify(message)));
    };

export const publishToExchange = <TMessage>(state: Partial<HaredoChainState<TMessage>>) =>
    async (message: TMessage, routingKey?: string, opts?: Options.Publish) => {
        const channel = await state.connectionManager.getChannel();
        return channel.publish(state.exchanges[0].exchange.name, routingKey, Buffer.from(JSON.stringify(message)), opts);
    };

export const addQueue = <T extends ChainFunction>(chain: T) =>
    (state: Partial<HaredoChainState>) =>
        (queue: Queue) =>
            chain(merge(state, { queue }));

export const addExchange = <T extends ChainFunction>(chain: T) =>
    (state: Partial<HaredoChainState>) =>
        (exchange: Exchange | string, type: ExchangeType | exchangeTypeStrings, opts: Partial<ExchangeOptions> = {}) => {
            if (typeof exchange === 'string') {
                exchange = new Exchange(exchange, type, opts);
            }
            return chain(merge(state, { exchange }));
        };

export const addExchangeBinding = <T extends ChainFunction>(chain: T) =>
    (state: Partial<HaredoChainState>) =>
        (
            exchange: Exchange | string,
            pattern: string | string[],
            type: ExchangeType | exchangeTypeStrings,
            opts: Partial<ExchangeOptions> = {}
        ) => {
            if (typeof exchange === 'string') {
                exchange = new Exchange(exchange, type, opts);
            }
            return chain(merge(state, { exchanges: [{ exchange, patterns: [].concat(pattern) }] }));
        };

export const addJson = <T extends ChainFunction>(chain: T) =>
    (state: Partial<HaredoChainState>) =>
        (json = true) =>
            chain(merge(state, { json }));

export const merge = <T>(base: T, top: T): T => {
    return Object.assign({}, base, top);
};

interface GeneralChainMembers<T> {
    connectionManager: ConnectionManager;
    // autoAck(autoAck: boolean): T;
    // autoReply(autoReply: boolean): T;
    // confirm(confirm: boolean): T;
    // failSpan(failSpan: number): T;
    // failThreshold(failThreshold: number): T;
    // failTimeout(failTimeout: number): T;
    json(json: boolean): T;
    // prefetch(prefetch: number): T;
    // reestablish(reestablish: boolean): T;
    // skipSetup(skipSetup: boolean): T;
    // use(middleware: Middleware<T> | Middleware<T>[]): T;
}

export interface Chain<TMessage> extends GeneralChainMembers<Chain<TMessage>> {
    queue: (queue: Queue) => Omit<Chain<TMessage>, 'exchange'>;
    exchange: (exchange: Exchange, pattern: string) => Chain<TMessage>;
}

export interface QueuePublishMethod<TMessage = unknown> {
    publish(message: TMessage, publishOpts?: Options.Publish): Promise<boolean>;
}

export interface ExchangePublishMethod<TMessage = unknown> {
    publish(message: TMessage, routingKey: string): Promise<boolean>;
}

export interface FullChain<TMessage> extends
    GeneralChainMembers<FullChain<TMessage>>{

    queue<TCustom = unknown>(queue: Queue<TCustom>): QueueChain<MergeTypes<TMessage, TCustom>>;

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
    GeneralChainMembers<ExchangeChain<TMessage>> {
    /**
     * Bind an exchange to the first exchange.
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
     * Bind an exchange to the first exchange.
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
    GeneralChainMembers<QueueChain<TMessage>>,
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

    subscribe<TCustom>(cb: SubscribeCallback): Promise<Consumer>
}
