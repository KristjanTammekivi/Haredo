import { Options } from 'amqplib';
import { get, keyValuePairs } from './utils';
import { BadArgumentsError } from './errors';

export enum ExchangeType {
    Direct = 'direct',
    Fanout = 'fanout',
    Topic = 'topic',
    Headers = 'headers',
    Delayed = 'x-delayed-message'
}

export type xDelayedType = ExchangeType.Direct |
    ExchangeType.Fanout |
    ExchangeType.Topic |
    ExchangeType.Headers;

const xDelayedTypesArray = [
    ExchangeType.Direct,
    ExchangeType.Fanout,
    ExchangeType.Topic,
    ExchangeType.Headers
];

export interface ExchangeOptions extends Options.AssertExchange {
    arguments: {
        'x-delayed-type'?: xDelayedType;
    }
}

export class Exchange<T = unknown> {
    constructor(
        public readonly name: string,
        public readonly type: ExchangeType,
        public readonly opts: ExchangeOptions = { arguments: {} }) {
        if (type === ExchangeType.Delayed && !xDelayedTypesArray.includes(get(opts, obj => obj.arguments['x-delayed-type']))) {
            throw new BadArgumentsError(`Exchange ${name}: exchange type type "delayed" requires a set x-delayed-type in arguments`);
        }
    }
    private clone(opts: Partial<Options.AssertExchange>) {
        return new Exchange<T>(this.name, this.type, Object.assign({}, this.opts, opts));
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
    alternateExchange(alternateExchange: Exchange) {
        return this.clone({ alternateExchange: alternateExchange.name });
    }
    toString() {
        return `Exchange ${this.name} ${this.type} opts:${keyValuePairs(this.opts).join(',')}`;
    }
}