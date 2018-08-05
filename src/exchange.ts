import { Options, Channel } from 'amqplib';
import { keyValuePairs } from './utils';
import { channelGetter } from './queue';

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

    async assert(channelGetter: channelGetter) {
        const channel = await channelGetter();
        return channel.assertExchange(this.name, this.type, this.opts).finally(() => channel.close());
    }

    async delete(channelGetter: channelGetter, opts?: Options.DeleteExchange) {
        const channel = await channelGetter();
        return channel.deleteExchange(this.name, opts).finally(() => channel.close());
    }

    async bind(channelGetter: channelGetter, destination: Exchange, pattern: string, args?: any) {
        const channel = await channelGetter();
        await this.assert(channelGetter);
        return channel.bindExchange(this.name, destination.name, pattern, args).finally(() => channel.close());
    }

    toString() {
        return `Exchange ${this.name} ${this.type} opts:${keyValuePairs(this.opts).join(',')}`;
    }
}
