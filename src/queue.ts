import * as Debug from 'debug';

const debug = Debug('haredo');

import * as amqplib from 'amqplib';
import { Replies, Options } from 'amqplib';
import { Exchange } from './exchange';
import { keyValuePairs } from './utils';

export const queue = (name: string, opts?: Options.AssertQueue) => new Queue(name, opts);

const DEFAULT_QUEUE_OPTIONS: Options.AssertQueue = {
    durable: true,
    exclusive: false
}

export type channelGetter = () => Promise<amqplib.Channel> | amqplib.Channel;

export class Queue {
    public name: string;
    private opts: Options.AssertQueue;

    constructor(name?: string, opts: amqplib.Options.AssertQueue = {}) {
        this.name = name;
        this.opts = Object.assign({}, opts, DEFAULT_QUEUE_OPTIONS);
    }

    async assert(channelGetter: channelGetter, force: boolean = false): Promise<Replies.AssertQueue> {
        const channel = await channelGetter();
        try {
            const reply = await channel.assertQueue(this.name, this.opts);
            await channel.close();
            return reply;
        } catch (e) {
            console.error(e.message);
            // channel.close();
            if (force) {
                debug('Deleting %s', this);
                await this.delete(channelGetter, {});
                debug('Reasserting %s', this);
                return await this.assert(channelGetter);
            }
            throw e;
        }
    }

    async delete(channelGetter: channelGetter, opts?: Options.DeleteQueue): Promise<Replies.DeleteQueue> {
        console.log('getting new channel');
        const channel = await channelGetter();
        console.log('channel', channel);
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
        return `Queue ${ this.name } opts:${ keyValuePairs(this.opts).join(',') }`;
    }
}
