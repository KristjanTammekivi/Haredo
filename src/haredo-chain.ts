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

interface IHaredoChainOpts {
    isSetup: boolean;
    prefetch: number;
    queue: Queue;
    exchanges: IAddExchange[];
    dlx: Exchange;
    dlq: Queue
}

export class HaredoChain {
    private haredo: Haredo;

    private state: Partial<IHaredoChainOpts> = {};

    private setupPromise:Promise<any>;

    constructor(haredo: Haredo, opts: Partial<IHaredoChainOpts>) {
        this.haredo = haredo;
        this.state.queue = opts.queue;
        this.state.exchanges = [].concat(opts.exchanges || []);
        this.state.prefetch = opts.prefetch || 0;
        this.state.isSetup = opts.isSetup || false;
    }

    getChannel() {
        return this.haredo.getChannel();
    }

    queue(queue: Queue) {
        if (this.state.queue) {
            throw new Error('Can only set one queue');
        }
        this.state.queue = queue;
        this.state.isSetup = false;
        return this.clone({
            isSetup: false,
            queue
        });
    }

    exchange(exchange: Exchange): HaredoChain;
    exchange(exchange: Exchange, pattern: string): HaredoChain;
    exchange(exchange: Exchange, pattern?: string) {
        return this.clone({
            isSetup: false,
            exchanges: this.state.exchanges.concat([{
                exchange,
                pattern
            }])
        });
    }

    prefetch(amount: number) {
        return this.clone({ prefetch: amount });
    }

    delay() {

    }

    json() {

    }

    clone(opts?: Partial<IHaredoChainOpts>) {
        return new HaredoChain(this.haredo, Object.assign({}, this.state, opts));
    }

    getQueue() {
        return this.state.queue;
    }

    dead(exchange: Exchange, queue?: Queue) {
        return this.clone({
            dlq: queue,
            dlx: exchange
        });
    }

    private async publishToQueue(message: any, opts: Options.Publish) {
        if (!this.state.queue) {
            throw new Error('Queue not set for publishing');
        }
        const channel = await this.haredo.connection.createChannel();
        channel.sendToQueue(this.state.queue.name, Buffer.from(stringify(message)), opts);
    }

    private async publishToExchange(message: any, routingKey: string, opts: Options.Publish) {
        if (this.state.exchanges.length === 0) {
            throw new Error('No exchanges set for publishing');
        }
        if (this.state.exchanges.length > 1) {
            throw new Error('Can\'t publish to more than 1 exchange')
        }
        const channel = await this.haredo.connection.createChannel();
        channel.publish(this.state.exchanges[0].exchange.name, routingKey, Buffer.from(stringify(message)), opts);
    }

    async setup() {
        const channel = await this.haredo.getChannel();
        if (this.state.queue) {
            debug('Asserting queue %s', this.state.queue);
            await this.state.queue.assert(channel);
        }
        if (this.state.exchanges.length) {
            for (const e of this.state.exchanges) {
                debug('Asserting exchange %s', e.exchange);
                await e.exchange.assert(channel);
                if (this.state.queue) {
                    if (!e.pattern) {
                        throw new Error('Exchange added without pattern for binding');
                    }
                    debug('Binding queue %s to exchange %s using pattern %s', this.state.queue.name, e.exchange.name, e.pattern);
                    await this.state.queue.bind(channel, e.exchange, e.pattern);
                }
            }
        }
        this.state.isSetup = true;
        this.setupPromise = undefined;
    }

    publish(message: any, opts?: Options.Publish): void;
    publish(message: any, routingKey: string, opts?: Options.Publish): void;
    async publish(message: any, ...args: any[]) {
        if (!this.state.queue && !this.state.exchanges.length) {
            throw new Error('Publishing requires a queue or an exchange');
        }
        if (this.state.exchanges.length > 1) {
            throw new Error('Can\'t publish to more than one exchange');
        }
        if (this.setupPromise) {
            debug('Awaiting on previous setup promise');
            await this.setupPromise;
        }
        if (!this.state.isSetup) {
            this.setupPromise = this.setup();
            await this.setupPromise;
        }
        if (this.state.queue) {
            return this.publishToQueue(message, args[0]);
        }
        return this.publishToExchange(message, args[0], args[1]);
    }

    async subscribe(cb: messageCallback) {
        if (!this.state.queue) {
            throw new Error('Can\'t subscribe without queue');
        }
        if (this.setupPromise) {
            await this.setupPromise;
        }
        if (!this.state.isSetup) {
            this.setupPromise = this.setup();
            await this.setupPromise;
        }
        return new Consumer(this, { autoAck: this.haredo.autoAck, prefetch: this.state.prefetch }, cb);
    }

}
