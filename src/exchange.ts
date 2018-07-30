import { Options, Channel } from 'amqplib';
import { keyValuePairs } from './utils';

export enum ExchangeType {
    Direct = 'direct',
    Fanout = 'fanout',
    Topic = 'topic',
    Headers = 'headers',
    Delayed = 'x-delayed-message'
}

export interface IExchangeOptions extends Options.AssertExchange {
    'x-delayed-type'?: 'direct' | 'fanout' | 'topic' | 'headers';
}

export class Exchange {
    public name: string;
    public type: ExchangeType;
    private opts: Options.AssertExchange;

    constructor(name: string, type: ExchangeType, opts: IExchangeOptions) {
        this.name = name;
        this.type = type;
        this.opts = opts;
        if (type === ExchangeType.Delayed && !opts['x-delayed-type']) {
            throw new Error('Exchange type delayed requires x-delayed-type option')
        }
    }

    async assert(channel: Channel) {
        const exchange = await channel.assertExchange(this.name, this.type, this.opts);
        return exchange;
    }

    async delete(channel: Channel, opts?: Options.DeleteExchange) {
        return channel.deleteExchange(this.name, opts);
    }

    async bind(channel: Channel, destination: Exchange, pattern: string, args?: any) {
        await this.assert(channel);
        return channel.bindExchange(this.name, destination.name, pattern, args);
    }

    toString() {
        return `Exchange ${this.name} ${this.type} opts:${keyValuePairs(this.opts).join(',')}`;
    }
}
