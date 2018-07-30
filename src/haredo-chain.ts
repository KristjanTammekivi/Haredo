import * as Debug from 'debug';

const debug = Debug('haredo');

import { Exchange } from './exchange';
import { Queue } from './queue';
import { Haredo } from './haredo';
import { Options } from 'amqplib';
import { Consumer, messageCallback } from './consumer';
import { stringify } from './utils';

interface IAddExchange {
    exchange: Exchange;
    pattern: string;
}

export class HaredoChain {
    private haredo: Haredo;

    private q: Queue;
    private x: IAddExchange[] = [];

    private dlx: Exchange;
    private dlq: Queue;

    private isSetup: boolean = false;

    private setupPromise:Promise<any>;

    constructor(haredo: Haredo, opts: { queue?: Queue, exchanges?: IAddExchange[] }) {
        this.haredo = haredo;
        this.q = opts.queue;
        this.x = opts.exchanges || [];
    }

    getChannel() {
        return this.haredo.getChannel();
    }

    queue(queue: Queue) {
        if (this.q) {
            throw new Error('Can only set one queue');
        }
        this.q = queue;
        this.isSetup = false;
    }

    exchange(exchange: Exchange, pattern: string) {
        this.x.push({ exchange, pattern });
        this.isSetup = false;
    }

    delay() {

    }

    json() {

    }

    getQueue() {
        return this.q;
    }

    dead(exchange: Exchange, queue?: Queue) {
        this.dlx = exchange;
        this.dlq = queue;
    }

    async publishToQueue(message: any, opts: Options.Publish) {
        if (!this.q) {
            throw new Error('Queue not set for publishing');
        }
        if (!this.isSetup) {
            this.setupPromise = this.setup();
        }
        if (this.setupPromise) {
            await this.setupPromise;
        }
        const channel = await this.haredo.connection.createChannel();
        channel.sendToQueue(this.q.name, Buffer.from(stringify(message)), opts);
    }

    async publishToExchange(message: any, routingKey: string, opts: Options.Publish) {
        if (this.x.length === 0) {
            throw new Error('No exchanges set for publishing');
        }
        if (this.x.length > 1) {
            throw new Error('Can\'t publish to more than 1 exchange')
        }
        if (!this.isSetup) {
            this.setupPromise = this.setup();
        }
        if (this.setupPromise) {
            await this.setupPromise;
        }
        const channel = await this.haredo.connection.createChannel();
        channel.publish(this.x[0].exchange.name, routingKey, Buffer.from(stringify(message)), opts);
    }

    async setup() {
        const channel = await this.haredo.getChannel();
        console.log(this.q);
        if (this.q) {
            debug('Asserting queue %s', this.q);
            await this.q.assert(channel);
        }
        if (this.x.length) {
            for (const e of this.x) {
                await e.exchange.assert(channel);
                if (this.q) {
                    await this.q.bind(channel, e.exchange, e.pattern)
                }
            }
        }
        this.isSetup = true;
        this.setupPromise = undefined;
    }

    publish(message: any, opts?: Options.Publish): void;
    publish(message: any, routingKey: string, opts?: Options.Publish): void;
    async publish(message: any, ...args: any[]) {
        if (!this.q && !this.x.length) {
            throw new Error('Publishing requires a queue or an exchange');
        }
        if (this.x.length > 1) {
            throw new Error('Can\'t publish to more than one exchange');
        }
        if (this.setupPromise) {
            await this.setupPromise;
        }
        if (!this.isSetup) {
            this.setupPromise = this.setup();
            await this.setupPromise;
        }
        if (this.q) {
            return this.publishToQueue(message, args[0]);
        }
        return this.publishToExchange(message, args[0], args[1]);
    }

    async subscribe(cb: messageCallback) {
        if (this.setupPromise) {
            await this.setupPromise;
        }
        if (!this.isSetup) {
            this.setupPromise = this.setup();
            await this.setupPromise;
        }
        return new Consumer(this, this.haredo.autoAck, cb);
    }

}
