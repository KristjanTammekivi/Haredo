import { Options } from 'amqplib';
import { get, keyValuePairs, flatObjectIsEqual } from './utils';
import { BadArgumentsError } from './errors';

export const enum ExchangeType {
    Direct = 'direct',
    Fanout = 'fanout',
    Topic = 'topic',
    Headers = 'headers',
    Delayed = 'x-delayed-message'
}

const XDELAYEDTYPEKEY = 'x-delayed-type';

export type xDelayedTypeStrings = 'direct' | 'fanout' | 'topic' | 'headers';

export type exchangeTypeStrings = 'direct' | 'fanout' | 'topic' | 'headers' | 'x-delayed-message';

export type XDelayedType = ExchangeType.Direct |
    ExchangeType.Fanout |
    ExchangeType.Topic |
    ExchangeType.Headers;

export const xDelayedTypesArray = [
    ExchangeType.Direct,
    ExchangeType.Fanout,
    ExchangeType.Topic,
    ExchangeType.Headers
];

type x = keyof typeof xDelayedTypesArray;

export interface ExchangeOptions extends Options.AssertExchange {
    arguments: {
        [XDELAYEDTYPEKEY]?: XDelayedType;
    };
}

export class Exchange<T = unknown> {
    /**
     * Create a Exchange object to aid in setup (note: this doesn't assert it)
     * @param name name of the exchange
     * @param type Set the exchange type (direct/topic/headers/fanout/x-delayed-message)
     * @param opts Options that will be passed directly to amqplib
     * [amqplib#assertExchange](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertExchange)
     */
    constructor(
        public readonly name: string,
        public readonly type: ExchangeType | exchangeTypeStrings,
        public readonly opts: Partial<ExchangeOptions> = { arguments: {} }) {
        if (
            type === ExchangeType.Delayed &&
            !xDelayedTypesArray.includes(get(opts, obj => obj.arguments[XDELAYEDTYPEKEY]))
        ) {
            throw new BadArgumentsError(`Exchange ${name}: exchange type type "delayed" requires a set x-delayed-type in arguments`);
        }
    }
    clone(opts: Partial<ExchangeOptions> = {}, type: ExchangeType = this.type as ExchangeType) {
        const newOpts = Object.assign({}, this.opts, { ...opts, arguments: Object.assign({}, this.opts.arguments, opts.arguments) });
        return new Exchange<T>(this.name, type, newOpts);
    }
    /**
     * if true, the exchange will survive broker restarts.
     * Defaults to true
     */
    durable(durable = true) {
        return this.clone({ durable });
    }
    /**
     * if true, the exchange will be destroyed once the number
     * of bindings for which it is the source drop to zero.
     * Defaults to false.
     */
    autoDelete(autoDelete = true) {
        return this.clone({ autoDelete });
    }
    /**
     * send all unrouted messages to this exchange
     */
    alternateExchange(alternateExchange: Exchange | string) {
        return this.clone({ alternateExchange: typeof alternateExchange === 'string' ? alternateExchange : alternateExchange.name });
    }
    /**
     * Set the exchange type as 'direct'
     */
    direct() {
        return this.clone({}, ExchangeType.Direct);
    }
    /**
     * Set the exchange type as 'topic'
     */
    topic() {
        return this.clone({}, ExchangeType.Topic);
    }
    /**
     * Set the exchange type as 'headers'
     */
    headers() {
        return this.clone({}, ExchangeType.Headers);
    }
    /**
     * Set the exchange type as 'fanout'
     */
    fanout() {
        return this.clone({}, ExchangeType.Fanout);
    }
    /**
     * Set the exchange type as 'delayed' and x-delayed-type attribute as the specified
     */
    delayed(xDelayedType: XDelayedType | xDelayedTypeStrings) {
        return this.clone({ arguments: { [XDELAYEDTYPEKEY]: xDelayedType as XDelayedType } }, ExchangeType.Delayed);
    }
    toString() {
        return `Exchange ${this.name} ${this.type} opts:${keyValuePairs(this.opts).join(',')}`;
    }
    isEqual(exchange: Exchange) {
        return this.name === exchange.name &&
            this.type === exchange.type &&
            this.opts.alternateExchange === exchange.opts.alternateExchange &&
            this.opts.autoDelete === exchange.opts.autoDelete &&
            this.opts.durable === exchange.opts.durable &&
            this.opts.internal === exchange.opts.internal &&
            flatObjectIsEqual(this.opts.arguments, exchange.opts.arguments);
    }
}
