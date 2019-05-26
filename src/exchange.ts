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

export type xDelayedTypeStrings = 'direct' | 'fanout' | 'topic' | 'headers';

type exchangeTypeStrings = 'direct' | 'fanout' | 'topic' | 'headers' | 'x-delayed-message';

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

type x = keyof typeof xDelayedTypesArray

export interface ExchangeOptions extends Options.AssertExchange {
    arguments: {
        'x-delayed-type'?: XDelayedType;
    }
}

export class Exchange<T = unknown> {
    constructor(
        public readonly name: string,
        public readonly type: ExchangeType | exchangeTypeStrings = 'direct',
        public readonly opts: ExchangeOptions = { arguments: {} }) {
        if (type === ExchangeType.Delayed && !xDelayedTypesArray.includes(get(opts, obj => obj.arguments['x-delayed-type'] as XDelayedType))) {
            throw new BadArgumentsError(`Exchange ${name}: exchange type type "delayed" requires a set x-delayed-type in arguments`);
        }
    }
    private clone(opts: Partial<ExchangeOptions> = {}, type: ExchangeType = this.type as ExchangeType) {
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
        return this.clone({ autoDelete })
    }
    /**
     * send all unrouted messages to this exchange
     */
    alternateExchange(alternateExchange: Exchange | string) {
        return this.clone({ alternateExchange: typeof alternateExchange === 'string' ? alternateExchange : alternateExchange.name });
    }
    direct() {
        return this.clone({}, ExchangeType.Direct);
    }
    topic() {
        return this.clone({}, ExchangeType.Topic);
    }
    headers() {
        return this.clone({}, ExchangeType.Headers);
    }
    fanout() {
        return this.clone({}, ExchangeType.Fanout);
    }
    delayed(xDelayedType: XDelayedType | xDelayedTypeStrings) {
        return this.clone({ arguments: { 'x-delayed-type': xDelayedType as XDelayedType } }, ExchangeType.Delayed);
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
