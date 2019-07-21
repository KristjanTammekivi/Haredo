import { Options } from 'amqplib';
import { Queue } from './queue';
import { Exchange, xDelayedTypeStrings, ExchangeType, ExchangeOptions } from './exchange';

import { HaredoChainState } from './state';
import { MergeTypes, stringify } from './utils';
import { makeConnectionManager } from './connection-manager';

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
    };
};

export const queueChain = <TMessage>(state: Partial<HaredoChainState<TMessage>>): QueueChain<TMessage> => {
    return {
        exchange: addExchange(queueChain)(state),
        json: addJson(queueChain)(state),
        publish: publishToQueue<TMessage>(state)
    };
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
        (exchange: Exchange | string, typeOrPattern: string) => {
            if (typeof exchange === 'string') {
                if ()
            }
            return chain(merge(state, { exchanges: [{ exchange, patterns: [pattern] }] }));
        };

export const addJson = <T extends ChainFunction>(chain: T) =>
    (state: Partial<HaredoChainState>) =>
        (json = true) =>
            chain(merge(state, { json }));

export const merge = <T>(base: T, top: T): T => {
    return Object.assign({}, base, top);
};

interface GeneralChainMethods<T> {
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

export interface Chain<TMessage> extends GeneralChainMethods<Chain<TMessage>> {
    queue: (queue: Queue) => Omit<Chain<TMessage>, 'exchange'>;
    exchange: (exchange: Exchange, pattern: string) => Chain<TMessage>;
}

export interface ExchangeMethod<T> {
    exchange(exchange: Exchange, pattern: string): T;
}

export interface QueuePublishMethod<TMessage = unknown> {
    publish(message: TMessage, publishOpts?: Options.Publish): Promise<boolean>;
}

export interface ExchangePublishMethod<TMessage = unknown> {
    publish(message: TMessage, routingKey: string): Promise<boolean>;
}

interface ExchangeAddOptions {
    options: ExchangeOptions;
    type: ExchangeType | xDelayedTypeStrings;
}

export interface FullChain<TMessage> extends
    GeneralChainMethods<FullChain<TMessage>>,
    ExchangeMethod<ExchangeChain<TMessage>>{

    queue<TCustom = unknown>(queue: Queue<TCustom>): QueueChain<MergeTypes<TMessage, TCustom>>;

    /**
    * Add an exchange to the chain. Pattern defaults to '#'
    *
    * @param exchange instance of Exchange
    */
    exchange<TCustom = unknown>(exchange: Exchange<TCustom>): ExchangeChain<MergeTypes<TMessage, TCustom>>;
    /**
     * Add an exchange to the chain.
     *
     * '*' means a single word
     *
     * '#' in routing keys means zero or more period separated words
     *
     * @param exchange instance of Exchange
     * @param pattern pattern or array of patterns to bind the queue to
     */
    exchange<TCustom = unknown>(exchange: Exchange<TCustom>, pattern?: string | string[]): ExchangeChain<MergeTypes<T, TCustom>>;
    /**
     * Add an exchange to the chain.
     *
     * @param exchange name of the exchange
     * @param type exchange type, defaults to Direct
     * @param pattern binding pattern for the exchange (to bind to a queue)
     * @param opts exchange options that will be passed to amqplib while asserting
     * [amqplib#assertExchange](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertExchange)
     */
    exchange<TCustom = unknown>(
        exchange: string,
        type?: ExchangeType | xDelayedTypeStrings,
        opts?: {
            pattern?: string | string[];
            options?: Partial<ExchangeOptions>;
        };
    ): ExchangeChain<MergeTypes<TMessage, TCustom>>;

}

export interface ExchangeChain<TMessage> extends
    GeneralChainMethods<ExchangeChain<TMessage>>,
    ExchangeMethod<MultiExchangeChain<TMessage>> {

    queue<TCustom = unknown>(queue: Queue<TCustom>): QueueChain<MergeTypes<TMessage, TCustom>>;
    exchange<TCustom = unknown>(exchange: Exchange<TCustom>): MultiExchangeChain<TMessage>;

}

export interface QueueChain<TMessage> extends
    GeneralChainMethods<QueueChain<TMessage>>,
    QueuePublishMethod<TMessage> {

    exchange<TCustom = unknown>(exchange: Exchange<TCustom>): QueueChain<MergeTypes<TMessage, TCustom>>;

}

export interface MultiExchangeChain<TMessage> extends
    GeneralChainMethods<MultiExchangeChain<TMessage>> {

    queue<TCustom = unknown>(queue: Queue<TCustom>): QueueChain<MergeTypes<TMessage, TCustom>>;
    exchange<TCustom = unknown>(exchange: Exchange<TCustom>): MultiExchangeChain<TMessage>;
}
