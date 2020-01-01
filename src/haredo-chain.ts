import { Queue } from './queue';
import { Exchange, ExchangeType, xDelayedTypeStrings, xDelayedTypesArray, ExchangeOptions } from './exchange';
import { MergeTypes, stringify, reject } from './utils';
import { BadArgumentsError, HaredoError } from './errors';
import { makeLogger } from './logger';
import { ConnectionManager } from './connection-manager';
import { PreparedMessage, ExtendedPublishType } from './prepared-message';
import { Buffer } from 'buffer';
import { Options } from 'amqplib';
import { HaredoChainState, defaultState, StateExchangeCollection, Middleware } from './state';
import { setup } from './setup';
import { HaredoQueueChain } from './queue-chain';

const { debug } = makeLogger('HaredoChain:');

export class HaredoChain<TMessage = unknown, TReply = unknown> {
    state: HaredoChainState<TMessage>;
    constructor(public connectionManager: ConnectionManager, state: Partial<HaredoChainState<TMessage>>) {
        this.state = defaultState(state);
    }
    private clone<T = TMessage, U = TReply>(state: Partial<HaredoChainState<T>>) {
        return new HaredoChain<T, U>(this.connectionManager, Object.assign({}, this.state, state));
    }
    /**
     * Add a queue to the chain (can only add 1, so choose wisely)
     *
     * @param queue instance of Queue
     */
    queue<T = unknown, U = unknown>(queue: Queue<T, U>): HaredoQueueChain<MergeTypes<TMessage, T>, MergeTypes<TReply, U>>;
    /**
     * Add a queue to the chain (can only add 1, so choose wisely)
     *
     * @param queueName name of the queue
     * @param opts options that will be passed to amqplib
     * [amqplib#assertQueue](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue)
     */
    queue<T = unknown, U = unknown>(
        queueName: string,
        opts?: Partial<Options.AssertQueue>
    ): HaredoQueueChain<MergeTypes<TMessage, T>, MergeTypes<TReply, U>>;
    queue<T = unknown, U = unknown>(queue: Queue<T, U> | string, opts: Partial<Options.AssertQueue> = {}) {
        if (!(queue instanceof Queue)) {
            queue = new Queue<T>(queue, opts);
        }
        if (this.state.queue) {
            throw new BadArgumentsError(`Chain can only contain one queue`);
        }
        return new HaredoQueueChain<MergeTypes<TMessage, T>, MergeTypes<TReply, U>>(
            this.connectionManager,
            Object.assign({}, this.state, {
                queue,
            } as HaredoChainState<MergeTypes<TMessage, T>>)
        );
    }
    /**
    * Add an exchange to the chain. Pattern defaults to '#'
    *
    * @param exchange instance of Exchange
    */
    exchange<U>(exchange: Exchange<U>): HaredoChain<MergeTypes<TMessage, U>>;
    /**
     * Add an exchange to the chain.
     *
     * '*' means a single word
     *
     * '#' in routing keys means zero or more period separated words
     *
     * @param exchange instance of Exchange
     * @param pattern pattern or array of patterns to bind the queue to
     */
    exchange<U>(exchange: Exchange<U>, pattern?: string | string[]): HaredoChain<MergeTypes<TMessage, U>>;
    /**
     * Add an exchange to the chain.
     *
     * @param exchange name of the exchange
     * @param type exchange type, defaults to Direct
     * @param pattern binding pattern for the exchange (to bind to a queue)
     * @param opts exchange options that will be passed to amqplib while asserting
     * [amqplib#assertExchange](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertExchange)
     */
    exchange<U>(
        exchange: string,
        type?: ExchangeType | xDelayedTypeStrings,
        pattern?: string | string[],
        opts?: Partial<ExchangeOptions>
    ): HaredoChain<MergeTypes<TMessage, U>>;
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
        const findFn = (x: StateExchangeCollection) => x.exchange.name === (exchange as Exchange).name;
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
        return this.clone<MergeTypes<TMessage, U>>({
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
     *
     * @param middleware function(s) to run before the subscribe callback gets executed
     **/
    use(middleware: Middleware<TMessage> | Middleware<TMessage>[]) {
        return this.clone({
            middleware: this.state.middleware.concat(middleware)
        });
    }
    /**
     * Set prefetch count for consuming (ie. amount of messages that will be received in parallel)
     *
     * 0 Means there is no limit
     *
     * @param prefetch number of messages to prefetch
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
        return this.clone<typeof json extends false ? string : TMessage>({ json });
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
     * Autoreply (disabled by default) automatically replies to messages
     * where message callback in subscriber returns a non-undefined value
     * (Only if message has replyTo and a correlationId)
     *
     * [RPC tutorial](https://www.rabbitmq.com/tutorials/tutorial-six-javascript.html)
     */
    autoReply(autoReply = true) {
        return this.clone({ autoReply });
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
     * Publish message and wait for a reply
     *
     * Read more at [RabbitMQ Docs](https://www.rabbitmq.com/tutorials/tutorial-six-javascript.html)
     *
     * Warning
     * -------
     * I don't use RPC in my day-to-day life so this isn't as well tested as the rest of the library. Use with caution and
     * be sure to report any issues to [KristjanTammekivi/Haredo](https://github.com/KristjanTammekivi/Haredo/issues)
     */

    async rpc(
        message: TMessage | PreparedMessage<TMessage>,
        routingKey: string,
        options?: Partial<ExtendedPublishType>
    ) {
        /* istanbul ignore if */
        if (this.state.exchanges.length > 1) {
            throw new HaredoError(`Can't publish to more than one exchange`);
        }
        await this.setup();
        if (!(message instanceof PreparedMessage)) {
            const content = this.state.json ? JSON.stringify(message) : message.toString();
            message = new PreparedMessage<TMessage>({ content, routingKey, options });
        } else {
            message = message.clone({ routingKey, options });
        }
        await this.connectionManager.rpcService.start();
        const queueName = this.connectionManager.rpcService.getQueueName();
        const correlationId = this.connectionManager.rpcService.generateCorrelationId();
        message = message.replyTo(queueName).correlationId(correlationId);

        await this.publishToExchange(message, this.state.exchanges[0].exchange);
        return this.connectionManager.rpcService.listen(correlationId);
    }

    /**
     * Publish a message to exchange/queue
     *
     * @param message message to publish
     * @param routingKey routing key
     * @param options options to pass to
     * [amqplib.publish](https://www.squaremobius.net/amqp.node/channel_api.html#channel_publish)
     */
    publish(message: TMessage | PreparedMessage<TMessage>, routingKey: string, opts?: Partial<ExtendedPublishType>): Promise<boolean>;
    async publish(
        message: TMessage | PreparedMessage<TMessage>,
        routingKey: string,
        options?: Partial<ExtendedPublishType>
    ) {
        if (this.state.exchanges.length > 1) {
            throw new HaredoError(`Can't publish to more than one exchange`);
        }
        await this.setup();
        if (!(message instanceof PreparedMessage)) {
            const content = this.state.json ? JSON.stringify(message) : message.toString();
            message = new PreparedMessage<TMessage>({ content, routingKey, options });
        } else {
            message = message.clone({ routingKey, options });
        }
        return this.publishToExchange(message, this.state.exchanges[0].exchange);
    }

    private async publishToExchange(message: PreparedMessage<TMessage>, exchange: Exchange<TMessage>) {
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

    /**
     * Assert / Bind exchanges/queues. Will be skipped if skipSetup is set in the chain
     */
    async setup() {
        // TODO: put this into a promise, don't let 2 calls
        if (this.state.skipSetup) {
            debug(`Skipping setup`);
            return;
        }
        debug('Setting up');
        await setup(this.connectionManager, this.state.queue, [].concat(this.state.exchanges));
    }
}
