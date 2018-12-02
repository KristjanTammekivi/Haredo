import { Options, Channel, Replies } from 'amqplib';
import { keyValuePairs } from './utils';
import { channelGetter } from './queue';

import { debug } from './logger';
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
    ExchangeType.Headers

export interface IExchangeOptions extends Options.AssertExchange {
    'x-delayed-type'?: xDelayedType;
}

export class Exchange<T = unknown> {
    public name: string;
    public type: ExchangeType;
    public readonly opts: Options.AssertExchange;

    constructor(name: string, type: ExchangeType, opts: IExchangeOptions = { arguments: {} }) {
        this.name = name;
        this.type = type;
        this.opts = opts;
        if (type === ExchangeType.Delayed && (!opts.arguments || !opts.arguments['x-delayed-type'])) {
            throw new Error('Exchange type delayed requires x-delayed-type option')
        }
    }

    clone(type: ExchangeType, opts: Partial<Options.AssertExchange>) {
        return new Exchange<T>(this.name, type, Object.assign({}, this.opts, opts) as Options.AssertExchange);
    }

    /**
     * sets the exchange type as delayed. If delayedType is not provided
     * it sets x-delayed-type to the previous type this exchange had
     */
    delayed(delayedType?: xDelayedType) {
        if (!delayedType && this.type === ExchangeType.Delayed) {
            throw new BadArgumentsError(`Can't set delayedType`);
        }
        return this.clone(ExchangeType.Delayed, {
            arguments: {
                'x-delayed-type': delayedType || this.type
            }
        });
    }

    /**
     * if true, the exchange will survive broker restarts.
     * Defaults to true
     */
    durable(value: boolean = true) {
        return this.clone(this.type, {
            durable: value
        })
    }

    /**
     * if true, the exchange will be destroyed once the number
     * of bindings for which it is the source drop to zero.
     * Defaults to false.
     */
    autoDelete(value: boolean = false) {
        return this.clone(this.type, {
            autoDelete: value
        });
    }

    /**
     * sends all unrouted messages to this exchange
     */
    alternateExchange(exchange: Exchange) {
        return this.clone(this.type, {
            alternateExchange: exchange.name
        });
    }

    async assert(channelGetter: channelGetter, force: boolean = false): Promise<Replies.AssertExchange> {
        try {
            const channel = await channelGetter();
            const reply = await channel.assertExchange(this.name, this.type, this.opts);
            await channel.close();
            return reply;
        } catch (e) {
            if (force) {
                debug('Deleting %s', this);
                await this.delete(channelGetter);
                debug('Reasserting %s', this);
                return this.assert(channelGetter);
            }
            throw e;
        }
    }

    async delete(channelGetter: channelGetter, opts?: Options.DeleteExchange) {
        const channel = await channelGetter();
        const reply = await channel.deleteExchange(this.name, opts);
        await channel.close();
        return reply;
    }

    async bind(channelGetter: channelGetter, destination: Exchange, pattern: string, args?: any) {
        const channel = await channelGetter();
        await this.assert(channelGetter);
        const reply = await channel.bindExchange(this.name, destination.name, pattern, args);
        await channel.close();
        return reply;
    }

    toString() {
        return `Exchange ${this.name} ${this.type} opts:${keyValuePairs(this.opts).join(',')}`;
    }
}
