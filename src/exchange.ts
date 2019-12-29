import { Options } from 'amqplib';

const XDELAYEDTYPEKEY = 'x-delayed-type';

export type StandardExchangeType = 'direct' | 'fanout' | 'topic' | 'headers';

export type ExchangeType = StandardExchangeType | 'x-delayed-message';

export const standardDelayedTypesArray: StandardExchangeType[] = [
    'direct',
    'fanout',
    'topic',
    'headers'
];

export interface ExchangeOptions extends Options.AssertExchange {
    arguments: {
        [XDELAYEDTYPEKEY]?: StandardExchangeType;
    };
}

export interface Exchange<TMessage = unknown> {
    type: 'exchange';
    getName: () => string;
    getType: () => ExchangeType;
    getOpts: () => ExchangeOptions;
    /**
     * if true, the exchange will survive broker restarts.
     * Defaults to true
     */
    durable: (durable?: boolean) => Exchange<TMessage>;
    /**
     * if true, the exchange will be destroyed once the number
     * of bindings for which it is the source drop to zero.
     * Defaults to false.
     */
    autoDelete: (autoDelete?: boolean) => Exchange<TMessage>;
    /**
     * send all unrouted messages to this exchange
     */
    alternateExchange: (alternateExchange: string | Exchange) => Exchange<TMessage>;
    /**
     * Set the exchange type as 'direct'
     */
    direct: () => Exchange<TMessage>;
    /**
     * Set the exchange type as 'topic'
     */
    topic: () => Exchange<TMessage>;
    /**
     * Set the exchange type as 'headers'
     */
    headers: () => Exchange<TMessage>;
    /**
     * Set the exchange type as 'fanout'
     */
    fanout: () => Exchange<TMessage>;
    /**
     * Set the exchange type as 'delayed' and x-delayed-type attribute as the specified
     */
    delayed: (xDelayedType: StandardExchangeType) => Exchange<TMessage>;
}

/**
 * Create a Exchange object to aid in setup (note: this doesn't assert it)
 * @param name name of the exchange
 * @param type Set the exchange type (direct/topic/headers/fanout/x-delayed-message)
 * @param opts Options that will be passed directly to amqplib
 * [amqplib#assertExchange](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertExchange)
 */
export const makeExchange = <TMessage>(name: string, type: ExchangeType, opts: Partial<ExchangeOptions> = {}): Exchange<TMessage> => {
    const cloneOpts = (top: Partial<ExchangeOptions>): ExchangeOptions => ({
        ...opts,
        ...top,
        arguments: {
            ...opts.arguments,
            ...top.arguments
        }
    });
    return {
        type: 'exchange',
        getName: () => name,
        getType: () => type,
        getOpts: () => cloneOpts({}),
        durable: (durable = true) => makeExchange(name, type, cloneOpts({ durable })),
        autoDelete: (autoDelete = true) => makeExchange(name, type, cloneOpts({ autoDelete })),
        alternateExchange: (alternateExchange: string | Exchange) => {
            if (typeof alternateExchange !== 'string') {
                alternateExchange = alternateExchange.getName();
            }
            return makeExchange(name, type, Object.assign({}, opts, { alternateExchange }));
        },
        direct: () => makeExchange(name, 'direct', opts),
        fanout: () => makeExchange(name, 'fanout', opts),
        headers: () => makeExchange(name, 'headers', opts),
        topic: () => makeExchange(name, 'topic', opts),
        delayed: (xDelayedType: StandardExchangeType) => makeExchange(name, 'x-delayed-message', cloneOpts({ arguments: { 'x-delayed-type': xDelayedType } }))
    };
};
