import { Exchange } from './exchange';
import { Queue } from './queue';
import { Haredo } from './haredo';
import { Options } from 'amqplib';
import { Consumer, messageCallback } from './consumer';
import { stringify, UnpackQueueArgument, MergeTypes, UnpackExchangeArgument, ExtendedPublishType, delayPromise } from './utils';
import { BadArgumentsError } from './errors';

import { debug } from './logger';
import { PreparedMessage } from './prepared-message';

interface IAddExchange {
    exchange: Exchange;
    pattern: string;
}

interface IHaredoChainOpts {
    isSetup: boolean;
    prefetch: number;
    queue: Queue;
    exchanges: IAddExchange[];
    failThreshold: number;
    failSpan: number;
    failTimeout: number;
    reestablish: boolean;
    json: boolean;
}

export class HaredoChain<T = unknown> {
    private haredo: Haredo;

    public readonly state: Partial<IHaredoChainOpts> = {};

    private setupPromise: Promise<any>;

    constructor(haredo: Haredo, opts: Partial<IHaredoChainOpts>) {
        this.haredo = haredo;
        this.state.queue = opts.queue;
        this.state.exchanges = [].concat(opts.exchanges || []);
        this.state.prefetch = opts.prefetch || 0;
        this.state.isSetup = opts.isSetup || false;
        this.state.reestablish = opts.reestablish || false;
        this.state.failSpan = opts.failSpan;
        this.state.failThreshold = opts.failThreshold;
        this.state.failTimeout = opts.failTimeout;
        this.state.json = opts.json || false;
    }

    async getChannel() {
        return this.haredo.getChannel();
    }

    queue<U extends Queue>(queue: U) {
        if (this.state.queue) {
            throw new Error('Can only set one queue');
        }
        return this.clone<MergeTypes<T, UnpackQueueArgument<U>>>({
            isSetup: false,
            queue
        });
    }

    exchange<U extends Exchange>(exchange: U): HaredoChain<MergeTypes<T, UnpackExchangeArgument<U>>>;
    exchange<U extends Exchange>(exchange: U, pattern: string): HaredoChain<MergeTypes<T, UnpackExchangeArgument<U>>>;
    exchange<U extends Exchange>(exchange: U, pattern?: string) {
        return this.clone<MergeTypes<T, UnpackExchangeArgument<U>>>({
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

    json() {
        return this.clone({ json: true });
    }

    clone<U = T>(opts?: Partial<IHaredoChainOpts>) {
        const stuff = new HaredoChain<U>(this.haredo, Object.assign({}, this.state, opts));
        return stuff;
    }

    getQueue() {
        return this.state.queue;
    }

    reestablish() {
        return this.clone({
            reestablish: true
        });
    }

    failThreshold(amount: number) {
        return this.clone({
            failThreshold: amount
        });
    }

    failSpan(ms: number) {
        return this.clone({
            failSpan: ms
        });
    }

    failTimeout(ms: number) {
        return this.clone({
            failTimeout: ms
        });
    }

    private async publishToQueue(message: T, opts: Options.Publish) {
        const channel = await this.getChannel();
        const response = await channel.sendToQueue(this.state.queue.name, Buffer.from(stringify(message)), opts);
        await channel.close();
        return response;
    }

    private async publishToExchange(message: T, routingKey: string, opts: Options.Publish = {}) {
        const channel = await this.haredo.getChannel();
        const response = await channel.publish(this.state.exchanges[0].exchange.name, routingKey, Buffer.from(stringify(message)), opts);
        await channel.close();
        return response;
    }

    async setup() {
        const channelGetter = () => this.getChannel();
        if (this.state.queue) {
            debug('Asserting %s', this.state.queue);
            await this.state.queue.assert(channelGetter, this.haredo.forceAssert);
            debug('Done asserting %s', this.state.queue);
        }
        if (this.state.exchanges.length) {
            debug(
                'Asserting exchanges %s',
                this.state.exchanges
                    .map(x => x.exchange.name)
                    .join()
            );
            for (const e of this.state.exchanges) {
                await e.exchange.assert(channelGetter);
                if (this.state.queue) {
                    if (!e.pattern) {
                        throw new Error('Exchange added without pattern for binding');
                    }
                    debug('Binding queue %s to exchange %s using pattern %s', this.state.queue.name, e.exchange.name, e.pattern);
                    await this.state.queue.bind(channelGetter, e.exchange, e.pattern);
                }
            }
            debug(
                'Done asserting exchanges %s',
                this.state.exchanges
                    .map(x => x.exchange.name)
                    .join()
            );
        }
        this.state.isSetup = true;
        this.setupPromise = undefined;
        return this;
    }

    publish(message: PreparedMessage<T>): Promise<boolean>;
    publish(message: T, opts?: ExtendedPublishType): Promise<boolean>;
    publish(message: T, routingKey: string, opts?: ExtendedPublishType): Promise<boolean>;
    async publish(message: T | PreparedMessage<T>, ...args: [any?, ExtendedPublishType?]): Promise<boolean> {
        if (!this.state.queue && !this.state.exchanges.length) {
            throw new Error('Publishing requires a queue or an exchange');
        }
        if (this.state.exchanges.length > 1) {
            throw new Error('Can\'t publish to more than one exchange');
        }
        /* istanbul ignore if */
        if (this.setupPromise) {
            debug('Awaiting on previous setup promise');
            await this.setupPromise;
        }
        if (!this.state.isSetup) {
            this.setupPromise = this.setup();
            await this.setupPromise;
        }
        if (!(message instanceof PreparedMessage)) {
            if (this.state.queue) {
                return this.publishToQueue(message, args[0]);
            }
            if (typeof args[0] !== 'string') {
                throw new BadArgumentsError('routingKey must be string when publishing to an exchange');
            }
            return this.publishToExchange(message, args[0], args[1]);
        }
        if (this.state.queue) {
            return this.publishToQueue(message.getContent(true), message.getOptions());
        }
        return this.publishToExchange(message.getContent(true), message.getRoutingKey(true), message.getOptions());
    }

    async subscribe(cb: messageCallback<T>) {
        if (!this.state.queue) {
            throw new Error(`Can't subscribe without queue`);
        }
        /* istanbul ignore if */
        if (this.setupPromise) {
            await this.setupPromise;
        }
        if (!this.state.isSetup) {
            this.setupPromise = this.setup();
            await this.setupPromise;
        }
        const consumer: Consumer<T> = new Consumer<T>(
            this,
            {
                autoAck: this.haredo.autoAck,
                prefetch: this.state.prefetch,
                reestablish: this.state.reestablish,
                fail: {
                    failSpan: this.state.failSpan,
                    failTimeout: this.state.failTimeout,
                    failThreshold: this.state.failThreshold
                }
            }, cb);
        this.haredo.addConsumer(consumer);
        await consumer.start();
        return consumer;
    }

}
