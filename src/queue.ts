import * as amqplib from 'amqplib';
import { Replies, Options } from 'amqplib';
import { Exchange } from './exchange';
import { keyValuePairs } from './utils';

export const queue = (name: string, opts?: Options.AssertQueue) => new Queue(name, opts);

const DEFAULT_QUEUE_OPTIONS: Options.AssertQueue = {
    durable: true,
    exclusive: false
}

export class Queue {
    public name: string;
    public isAsserted: boolean = false;
    private opts: Options.AssertQueue;

    constructor(name?: string, opts: amqplib.Options.AssertQueue = {}) {
        this.name = name;
        this.opts = Object.assign({}, opts, DEFAULT_QUEUE_OPTIONS);
    }

    async assert(channel: amqplib.Channel): Promise<Replies.AssertQueue> {
        const queue = await channel.assertQueue(this.name, this.opts);
        this.isAsserted = true;
        return queue;
    }

    async delete(channel: amqplib.Channel, opts?: Options.DeleteQueue): Promise<Replies.DeleteQueue> {
        const response = await channel.deleteQueue(this.name, opts);
        this.isAsserted = false;
        return response;
    }

    async purge(channel: amqplib.Channel): Promise<Replies.PurgeQueue> {
        return channel.purgeQueue(this.name);
    }

    async bind(channel: amqplib.Channel, exchange: Exchange, pattern: string, args?: any): Promise<Replies.Empty> {
        return channel.bindQueue(this.name, exchange.name, pattern, args);
    }

    toString() {
        return `Queue ${ this.name } opts:${ keyValuePairs(this.opts).join(',') }`;
    }
}
