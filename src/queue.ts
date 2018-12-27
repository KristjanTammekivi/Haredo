import { debug } from './logger';
import * as amqplib from 'amqplib';
import { Replies, Options } from 'amqplib';
import { Exchange } from './exchange';
import { keyValuePairs } from './utils';

const DEFAULT_QUEUE_OPTIONS: Options.AssertQueue = {
    durable: true,
    exclusive: false
}

export type channelGetter = () => Promise<amqplib.Channel> | amqplib.Channel;

export class Queue<T = unknown> {
    public name: string;
    public readonly opts: Options.AssertQueue;

    constructor(name?: string, opts: amqplib.Options.AssertQueue = {}) {
        this.name = name;
        this.opts = Object.assign({}, DEFAULT_QUEUE_OPTIONS, opts);
    }

    clone(opts: Partial<amqplib.Options.AssertQueue>) {
        return new Queue<T>(this.name, Object.assign({}, this.opts, opts));
    }

    /**
     * if true, the queue will survive broker restarts,
     * modulo the effects of exclusive and autoDelete;
     * this defaults to true if not supplied, unlike the others.
     */
    durable(value: boolean = true) {
        return this.clone({ durable: value });
    }

    /**
     * if true, the queue will be deleted when the number
     * of consumers drops to zero (defaults to false)
     */
    autoDelete(value: boolean = true) {
        return this.clone({ autoDelete: value });
    }

    /**
     * if true, scopes the queue to the connection (defaults to false)
     */
    exclusive(value: boolean = true) {
        return this.clone({ exclusive: value });
    }

    /**
     * expires messages arriving in the queue after n milliseconds
     */
    messageTtl(value: number) {
        return this.clone({ messageTtl: value });
    }

    /**
     * the queue will be destroyed after n milliseconds of disuse,
     * where use means having consumers
     */
    expires(value: number) {
        return this.clone({ expires: value });
    }

    /**
     * an exchange to which messages discarded from the queue will be resent.
     * if deadLetterRoutingKey is not sent the message’s routing key
     * (and CC and BCC, if present) will be preserved.
     * A message is discarded when it expires or is rejected or nacked,
     * or the queue limit is reached.
     */
    deadLetterExchange(deadLetterExchange: Exchange, deadLetterRoutingKey?: string) {
        return this.clone({
            deadLetterExchange: deadLetterExchange.name,
            deadLetterRoutingKey
        });
    }

    async assert(channelGetter: channelGetter, force: boolean = false): Promise<Replies.AssertQueue> {
        const channel = await channelGetter();
        try {
            const reply = await channel.assertQueue(this.name, this.opts);
            this.name = reply.queue;
            await channel.close();
            return reply;
        } catch (e) {
            if (force) {
                debug('Deleting %s', this);
                await this.delete(channelGetter, {});
                debug('Reasserting %s', this);
                return this.assert(channelGetter);
            }
            throw e;
        }
    }

    async delete(channelGetter: channelGetter, opts?: Options.DeleteQueue): Promise<Replies.DeleteQueue> {
        const channel = await channelGetter();
        const reply = await channel.deleteQueue(this.name, opts);
        await channel.close();
        return reply;
    }

    async purge(channelGetter: channelGetter): Promise<Replies.PurgeQueue> {
        const channel = await channelGetter();
        const reply = await channel.purgeQueue(this.name)
        await channel.close();
        return reply;
    }

    async bind(channelGetter: channelGetter, exchange: Exchange, pattern: string, args?: any): Promise<Replies.Empty> {
        const channel = await channelGetter();
        const reply = await channel.bindQueue(this.name, exchange.name, pattern, args);
        await channel.close();
        return reply;
    }

    toString() {
        return `Queue${this.name ? ` ${this.name} ` : ' '}opts:${keyValuePairs(this.opts).join(',')}`;
    }
}
