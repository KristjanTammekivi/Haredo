import { Queue } from './queue';
import { Exchange, ExchangeType, xDelayedTypeStrings, xDelayedTypesArray, ExchangeOptions } from './exchange';
import { MergeTypes, stringify, promiseMap, defaultToTrue, reject } from './utils';
import { BadArgumentsError, HaredoError } from './errors';
import { makeLogger } from './logger';
import { ConnectionManager } from './connection-manager';
import { Consumer, MessageCallback } from './consumer';
import { PreparedMessage, ExtendedPublishType } from './prepared-message';
import { Buffer } from 'buffer';
import { Options } from 'amqplib';
import { HaredoMessage } from './haredo-message';

const { debug } = makeLogger('HaredoChain:');

export interface AddExchange {
    exchange: Exchange;
    patterns: string[];
}

export interface HaredoChainState<T> {
    autoAck: boolean;
    prefetch: number;
    queue: Queue<T>;
    exchanges: AddExchange[];
    failThreshold: number;
    failSpan: number;
    failTimeout: number;
    reestablish: boolean;
    json: boolean;
    confirm: boolean;
    skipSetup: boolean;
    middleware: Middleware<T>[];
}

export interface Middleware<T> {
    (message: HaredoMessage<T>, next: () => Promise<void>): void | Promise<void>;
}

export class HaredoChain<T = unknown> {
    state: Partial<HaredoChainState<T>> = {};
    constructor(public connectionManager: ConnectionManager, state: Partial<HaredoChainState<T>>) {
        this.state.autoAck = defaultToTrue(state.autoAck);
        this.state.queue = state.queue;
        this.state.exchanges = [].concat(state.exchanges || []);
        this.state.prefetch = state.prefetch || 0;
        this.state.reestablish = defaultToTrue(state.reestablish);
        this.state.failSpan = state.failSpan;
        this.state.failThreshold = state.failThreshold;
        this.state.failTimeout = state.failTimeout;
        this.state.json = defaultToTrue(state.json);
        this.state.confirm = state.confirm;
        this.state.skipSetup = state.skipSetup;
        this.state.middleware = state.middleware || [];
    }
    private clone<U = T>(state: Partial<HaredoChainState<U>>) {
        return new HaredoChain<U>(this.connectionManager, Object.assign({}, this.state, state));
    }
    /**
     * Add a queue to the chain (can only add 1, so choose wisely)
     */
    queue<U = unknown>(queue: Queue<U>): HaredoChain<MergeTypes<T, U>>;
    queue<U = unknown>(queueName: string, opts?: Partial<Options.AssertQueue>): HaredoChain<MergeTypes<T, U>>;
    queue<U = unknown>(queue: Queue<U> | string, opts: Partial<Options.AssertQueue> = {}) {
        if (!(queue instanceof Queue)) {
            queue = new Queue<U>(queue, opts);
        }
        if (this.state.queue) {
            throw new BadArgumentsError(`Chain can only contain one queue`);
        }
        return this.clone<MergeTypes<T, U>>({
            queue,
        });
    }
    /**
     * Add an exchange to the chain, pattern is not necessary when
     * publishing.
     * '#' - wildcard for zero or more dot-limited words
     *
     * '*' - wildcard for a single word
     */
    exchange<U>(exchange: Exchange<U>): HaredoChain<MergeTypes<T, U>>;
    exchange<U>(exchange: Exchange<U>, pattern?: string | string[]): HaredoChain<MergeTypes<T, U>>;
    exchange<U>(
        exchange: string,
        type?: ExchangeType | xDelayedTypeStrings,
        pattern?: string | string[],
        opts?: Partial<ExchangeOptions>
    ): HaredoChain<MergeTypes<T, U>>;
    exchange<U>(
        exchange: Exchange<U> | string,
        // tslint:disable-next-line:max-union-size
        typeOrPattern: ExchangeType | xDelayedTypeStrings = ExchangeType.Direct,
        pattern: string | string[] = '#',
        exchangeOptions: Partial<ExchangeOptions> = {}
    ) {
        if (typeof exchange === 'string') {
            if (typeOrPattern !== undefined && !xDelayedTypesArray.includes(typeOrPattern as ExchangeType)) {
                // tslint:disable-next-line:max-line-length
                throw new BadArgumentsError(`When .exchange is called with a string as first argument, the second argument must be a valid exchange type, received ${typeOrPattern}, expected one of ${xDelayedTypesArray.join(' | ')}`);
            }
            exchange = new Exchange(exchange, typeOrPattern, exchangeOptions);
        } else {
            pattern = typeOrPattern;
        }
        const patterns = [].concat(pattern);
        const findFn = (x: AddExchange) => x.exchange.name === (exchange as Exchange).name;
        const existingExchangery = this.state.exchanges.find(findFn);
        if (existingExchangery) {
            const newPatterns = existingExchangery.patterns
                .concat(patterns.filter(newPattern => !existingExchangery.patterns.includes(newPattern)));
            return this.clone({
                exchanges: reject(this.state.exchanges, findFn).concat({
                    exchange: existingExchangery.exchange,
                    patterns: newPatterns
                })
            });
        }
        return this.clone<MergeTypes<T, U>>({
            exchanges: this.state.exchanges.concat({
                exchange,
                patterns
            })
        });
    }
    /**
     * Add a middleware to subscriber. Middleware will be invoked with the message instance and
     * a function that returns a promise which will be resolved after rest of the middleware is
     * finished. If the "next" function isn't called after middleware finishes executing it is
     * still executed. If message was acked/nacked during middleware the rest of the callbacks
     * in the chain are not executed
     **/
    use(middleware: Middleware<T> | Middleware<T>[]) {
        return this.clone({
            middleware: this.state.middleware.concat(middleware)
        });
    }
    /**
     * Set prefetch count for consuming (ie. amount of messages that will be received in parallel)
     *
     * 0 Means there is no limit
     */
    prefetch(prefetch: number) {
        return this.clone({ prefetch });
    }
    /**
     * Pass in boolean to enable / disable json mode (it's on by default).
     * When json is enabled, messages that are published without using PreparedMessage
     * class will be passed through JSON.stringify. When subscribing message data will
     * be run through JSON.parse
     */
    json(json = true) {
        return this.clone<typeof json extends false ? string : T>({ json });
    }
    /**
     * Reestablish a subscriber when channel / connection closes (on by default)
     */
    reestablish(reestablish = true) {
        return this.clone({ reestablish });
    }
    /**
     * Set the amount of fails the system will allow in {failSpan} milliseconds
     * before the subscriber waits for {failTimeout} milliseconds until passing
     * the next message to subscriber callback
     *
     * defaults to Infinity
     */
    failThreshold(failThreshold: number) {
        return this.clone({ failThreshold });
    }
    /**
     * Set the failSpan, the amount of time in milliseconds during which {failThreshold}
     * amount of nacked messages can happen before the subscriber waits {failTimeout}
     * milliseconds until passing the next message to subscriber callback.
     *
     * defaults to 5000
     */
    failSpan(failSpan: number) {
        return this.clone({ failSpan });
    }
    /**
     * Set the failTimeout, the amount of time in milliseconds to wait until
     * passing the next message to subscriber callback after {failThreshold}
     * amount of nacked messages happen within {failSpan
     *
     * defaults to 5000
     */
    failTimeout(failTimeout: number) {
        return this.clone({ failTimeout });
    }
    /**
     * Autoack (enabled by default) automatically acks/nacks messages when
     * subscriber callback throws an error or the promise returned from it
     * gets rejected
     */
    autoAck(autoAck = true) {
        return this.clone({ autoAck });
    }
    /**
     * Subscribe to messages in the queue specified in the chain
     */
    async subscribe(cb: MessageCallback<T>) {
        if (!this.state.queue) {
            throw new BadArgumentsError('Queue not set for subscribing');
        }
        const consumer = new Consumer<T>({
            autoAck: this.state.autoAck,
            fail: {
                failSpan: this.state.failSpan,
                failThreshold: this.state.failThreshold,
                failTimeout: this.state.failTimeout
            },
            json: this.state.json,
            prefetch: this.state.prefetch,
            queue: this.state.queue,
            reestablish: this.state.reestablish,
            setterUpper: () => this.setup(),
            middleware: this.state.middleware
        }, this.connectionManager, cb);
        this.connectionManager.consumerManager.add(consumer);
        await consumer.start();
        return consumer;
    }

    /**
     * Enable publishing using ConfirmChannels
     *
     * See [RabbitMq Docs](https://www.rabbitmq.com/confirms.html)
     */
    confirm(confirm = true) {
        return this.clone({ confirm });
    }

    /**
     * Don't run setup in queues/exchanges in this chain. Useful for faster publishing
     *
     * Use .setup on a chain to do asserts/bindings if they don't already exist
     */
    skipSetup(skipSetup = true) {
        return this.clone({ skipSetup });
    }

    /**
     * Publish a message to exchange/queue
     */
    publish(message: T | PreparedMessage<T>): Promise<boolean>;
    publish(message: T | PreparedMessage<T>, opts?: Partial<ExtendedPublishType>): Promise<boolean>;
    publish(message: T | PreparedMessage<T>, routingKey: string, opts?: Partial<ExtendedPublishType>): Promise<boolean>;
    async publish(
        message: T | PreparedMessage<T>,
        optRoutingKey?: string | Partial<ExtendedPublishType>,
        optPublishSettings?: Partial<ExtendedPublishType>
    ) {
        if (this.state.exchanges.length > 1) {
            throw new HaredoError(`Can't publish to more than one exchange`);
        }
        await this.setup();
        let routingKey: string;
        let options: Partial<ExtendedPublishType>;
        if (typeof optRoutingKey === 'string') {
            routingKey = optRoutingKey;
            options = optPublishSettings;
        } else {
            options = optRoutingKey;
        }
        if (!(message instanceof PreparedMessage)) {
            const content = this.state.json ? JSON.stringify(message) : message.toString();
            message = new PreparedMessage<T>({ content, routingKey, options });
        } else {
            message = message.clone({ routingKey, options });
        }
        if (this.state.exchanges.length) {
            return this.publishToExchange(message, this.state.exchanges[0].exchange);
        }
        return this.publishToQueue(message, this.state.queue);
    }

    private async publishToExchange(message: PreparedMessage<T>, exchange: Exchange<T>) {
        if (this.state.confirm) {
            return new Promise<boolean>(async (resolve, reject) => {
                try {
                    const confirmChannel = await this.connectionManager.getConfirmChannelForPublishing();
                    const response = await confirmChannel.publish(
                        exchange.name,
                        message.routingKey,
                        Buffer.from(stringify(message.content)),
                        message.options,
                        (err) => {
                            /* istanbul ignore if */
                            if (err) {
                                reject(err);
                            } else {
                                resolve(response);
                            }
                        }
                    );
                } catch (e) /* istanbul ignore next */ {
                    reject(e);
                }
            });
        }
        const channel = await this.connectionManager.getChannelForPublishing();
        return channel.publish(
            exchange.name,
            message.routingKey,
            Buffer.from(stringify(message.content)),
            message.options
        );
    }

    private async publishToQueue(message: PreparedMessage<T>, queue: Queue<T>) {
        if (this.state.confirm) {
            return new Promise<boolean>(async (resolve, reject) => {
                try {
                    const channel = await this.connectionManager.getConfirmChannelForPublishing();
                    const response = channel.sendToQueue(
                        queue.name,
                        Buffer.from(stringify(message.content)),
                        message.options,
                        (err) => {
                            // TODO: wrap this error with HaredoError
                            /* istanbul ignore if */
                            if (err) {
                                reject(err);
                            } else {
                                resolve(response);
                            }
                        }
                    );
                } catch (e) /* istanbul ignore next */ {
                    reject(e);
                }
            });
        }
        const channel = await this.connectionManager.getChannelForPublishing();
        return channel.sendToQueue(queue.name, Buffer.from(stringify(message.content)), message.options);
    }

    /**
     * Assert / Bind exchanges/queues. Will be skipped if skipSetup is set in the chain
     */
    async setup() {
        // TODO: put this into a promise, don't let 2 calls
        if (this.state.skipSetup) {
            debug(`Skipping setup`);
            return;
        }
        if (this.state.queue) {
            if (this.state.queue.anonymous && this.state.queue.isPerishable()) {
                this.connectionManager.emitter.once('connectionclose', () => {
                    debug('Clearing name for queue', this.state.queue);
                    this.state.queue.name = '';
                });
            }
            if (!(this.state.queue.name || '').startsWith('amq.')) {
                debug(`Asserting ${this.state.queue}`);
                await this.connectionManager.assertQueue(this.state.queue);
                debug(`Done asserting ${this.state.queue}`);
            }
        }
        await promiseMap(this.state.exchanges, async (exchangery) => {
            debug(`Asserting ${exchangery.exchange}`);
            await this.connectionManager.assertExchange(exchangery.exchange);
            if (this.state.queue) {
                const queue = this.state.queue;
                await promiseMap(exchangery.patterns, async (pattern) => {
                    debug(`Binding ${queue} to ${exchangery.exchange} using pattern ${pattern}`);
                    await this.connectionManager.bindQueue(exchangery.exchange, this.state.queue, pattern);
                });
            }
            debug(`Done asserting ${exchangery.exchange}`);
        });
    }
}
