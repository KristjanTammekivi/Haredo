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
    preferences?: {
        passive?: boolean;
    };
}

export interface Exchange<TMessage = unknown> {
    metaType: 'exchange';
    getName(): string;
    getType(): ExchangeType;
    getOpts(): ExchangeOptions;
    /**
     * if true, the exchange will survive broker restarts.
     * Defaults to true
     */
    durable(durable?: boolean): Exchange<TMessage>;
    /**
     * if true, the exchange will be destroyed once the number
     * of bindings for which it is the source drop to zero.
     * Defaults to false.
     */
    autoDelete(autoDelete?: boolean): Exchange<TMessage>;
    /**
     * send all unrouted messages to this exchange
     */
    alternateExchange(alternateExchange: string | Exchange): Exchange<TMessage>;
    /**
     * Set the exchange type as 'direct'
     */
    direct(): Exchange<TMessage>;
    /**
     * Set the exchange type as 'topic'
     */
    topic(): Exchange<TMessage>;
    /**
     * Set the exchange type as 'headers'
     */
    headers(): Exchange<TMessage>;
    /**
     * Set the exchange type as 'fanout'
     */
    fanout(): Exchange<TMessage>;
    /**
     * Set the exchange type as 'delayed' and x-delayed-type attribute as the specified
     */
    delayed(xDelayedType: StandardExchangeType): Exchange<TMessage>;
    /** Use checkExchange instead of assertExchange for setup */
    passive(passive?: boolean): Exchange<TMessage>;
}

/**
 * Create a Exchange object to aid in setup (note: this doesn't assert it)
 * @param name name of the exchange
 * @param type Set the exchange type (direct/topic/headers/fanout/x-delayed-message)
 * @param opts Options that will be passed directly to amqplib
 * [amqplib#assertExchange](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertExchange)
 */
export const makeExchangeConfig = <TMessage>(name: string, type: ExchangeType, opts: Partial<ExchangeOptions> = {}): Exchange<TMessage> => {
    const cloneOpts = (top: Partial<ExchangeOptions>): ExchangeOptions => ({
        ...opts,
        ...top,
        arguments: {
            ...opts.arguments,
            ...top.arguments
        },
        preferences: {
            ...opts.preferences,
            ...top.preferences
        }
    });
    return {
        metaType: 'exchange',
        getName: () => name,
        getType: () => type,
        getOpts: () => cloneOpts({}),
        durable: (durable = true) => makeExchangeConfig(name, type, cloneOpts({ durable })),
        autoDelete: (autoDelete = true) => makeExchangeConfig(name, type, cloneOpts({ autoDelete })),
        alternateExchange: (alternateExchange: string | Exchange) => {
            if (typeof alternateExchange !== 'string') {
                alternateExchange = alternateExchange.getName();
            }
            return makeExchangeConfig(name, type, Object.assign({}, opts, { alternateExchange }));
        },
        direct: () => makeExchangeConfig(name, 'direct', opts),
        fanout: () => makeExchangeConfig(name, 'fanout', opts),
        headers: () => makeExchangeConfig(name, 'headers', opts),
        topic: () => makeExchangeConfig(name, 'topic', opts),
        delayed: (xDelayedType: StandardExchangeType) => makeExchangeConfig(name, 'x-delayed-message', cloneOpts({ arguments: { 'x-delayed-type': xDelayedType } })),
        passive: (passive = true) => makeExchangeConfig(name, type, cloneOpts({ preferences: { passive } }))
    };
};

/**
 * Returns true if passed in object is an exchange. Acts as a type guard for Exchange.
 * @param obj Object to check
 */
export const isHaredoExchange = (obj: any): obj is Exchange => {
    return obj?.metaType === 'exchange';
};
