import { Queue } from './queue';
import { Exchange, ExchangeType, xDelayedTypeStrings, xDelayedTypesArray, ExchangeOptions } from './exchange';
import { MergeTypes, stringify, promiseMap } from './utils';
import { BadArgumentsError, HaredoError } from './errors';
import { makeDebug } from './logger';
import { ConnectionManager } from './connection-manager';
import { Consumer, MessageCallback } from './consumer';
import { PreparedMessage, ExtendedPublishType } from './prepared-message';
import { Buffer } from 'buffer';

const log = makeDebug('connectionmanager:');

export interface AddExchange {
    exchange: Exchange;
    pattern: string;
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
}

export class HaredoChain<T = unknown> {
    state: Partial<HaredoChainState<T>> = {};
    constructor(public connectionManager: ConnectionManager, state: Partial<HaredoChainState<T>>) {
        this.state.autoAck = state.autoAck === false ? false : true;
        this.state.queue = state.queue;
        this.state.exchanges = [].concat(state.exchanges || []);
        this.state.prefetch = state.prefetch || 0;
        this.state.reestablish = state.reestablish === undefined ? true : false;
        this.state.failSpan = state.failSpan;
        this.state.failThreshold = state.failThreshold;
        this.state.failTimeout = state.failTimeout;
        this.state.json = state.json === false ? false : true;
        this.state.confirm = state.confirm;
    }
    private clone<U = T>(state: Partial<HaredoChainState<U>>) {
        return new HaredoChain<U>(this.connectionManager, Object.assign({}, this.state, state))
    }
    queue<U = unknown>(queue: Queue<U> | string) {
        if (!(queue instanceof Queue)) {
            queue = new Queue<U>(queue);
        }
        if (this.state.queue) {
            throw new BadArgumentsError(`Chain can only contain one queue`);
        }
        return this.clone<MergeTypes<T, U>>({
            queue,
        });
    }
    exchange<U>(exchange: Exchange<U>): HaredoChain<MergeTypes<T, U>>
    exchange<U>(exchange: Exchange<U>, pattern?: string): HaredoChain<MergeTypes<T, U>>
    exchange<U>(exchange: string, type?: ExchangeType | xDelayedTypeStrings, pattern?: string, opts?: Partial<ExchangeOptions>): HaredoChain<MergeTypes<T, U>>
    exchange<U>(
        exchange: Exchange<U> | string,
        typeOrPattern: ExchangeType | xDelayedTypeStrings = ExchangeType.Direct,
        pattern: string = '#',
        exchangeOptions: Partial<ExchangeOptions> = {}
    ) {
        if (typeof exchange === 'string') {
            if (typeOrPattern !== undefined && !xDelayedTypesArray.includes(typeOrPattern as ExchangeType)) {
                throw new BadArgumentsError(`When .exchange is called with a string as first argument, the second argument must be a valid exchange type, received ${typeOrPattern}, expected one of ${xDelayedTypesArray.join(' | ')}`);
            }
            exchange = new Exchange(exchange, typeOrPattern, exchangeOptions);
        } else {
            pattern = typeOrPattern
        }
        return this.clone<MergeTypes<T, U>>({
            exchanges: this.state.exchanges.concat({
                exchange,
                pattern
            })
        })
    }
    prefetch(prefetch: number) {
        return this.clone({ prefetch });
    }
    json(json = true) {
        return this.clone({ json });
    }
    reestablish(reestablish = true) {
        return this.clone({ reestablish });
    }
    failThreshold(failThreshold: number) {
        return this.clone({ failThreshold });
    }
    failSpan(failSpan: number) {
        return this.clone({ failSpan });
    }
    failTimeout(failTimeout: number) {
        return this.clone({ failTimeout });
    }
    autoAck(autoAck = true) {
        return this.clone({ autoAck });
    }
    async subscribe(cb: MessageCallback<T>) {
        const consumer = new Consumer({
            autoAck: this.state.autoAck,
            fail: {
                failSpan: this.state.failSpan,
                failThreshold: this.state.failThreshold,
                failTimeout: this.state.failTimeout
            },
            json: this.state.json,
            prefetch: this.state.prefetch,
            queueName: this.state.queue.name,
            reestablish: this.state.reestablish,
            setterUpper: () => this.setup()
        }, this.connectionManager, cb);
        this.connectionManager.consumerManager.add(consumer);
        await consumer.start();
        return consumer;
    }

    confirm(confirm = true) {
        return this.clone({ confirm });
    }

    publish(message: T | PreparedMessage<T>): Promise<boolean>;
    publish(message: T | PreparedMessage<T>, opts?: Partial<ExtendedPublishType>): Promise<boolean>;
    publish(message: T | PreparedMessage<T>, routingKey: string, opts?: Partial<ExtendedPublishType>): Promise<boolean>;
    async publish(
        message: T | PreparedMessage<T>,
        optRoutingKey?: string | Partial<ExtendedPublishType>,
        optPublishSettings?: Partial<ExtendedPublishType>
    ) {
        if (!this.queue && !this.state.exchanges.length) {
            throw new HaredoError('Publishing requires a queue or an exchange');
        }
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
            message = new PreparedMessage<T>({ content: JSON.stringify(message), routingKey, options });
        } else {
            message = message.clone({ routingKey, options });
        }
        if (this.state.exchanges.length) {
            return this.publishToExchange(message, this.state.exchanges[0].exchange)
        } else {
            return this.publishToQueue(message, this.state.queue);
        }
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
                            if (err) {
                                reject(err);
                            } else {
                                resolve(response);
                            }
                        }
                    );
                } catch (e) {
                    reject(e);
                }
            });
        }
        const channel = await this.connectionManager.getChannelForPublishing();
        const response = await channel.publish(
            exchange.name,
            message.routingKey,
            Buffer.from(stringify(message.content)),
            message.options
        );
        return response;
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
                            if (err) {
                                reject(err);
                            } else {
                                resolve(response);
                            }
                        }
                    );
                } catch (e) {
                    reject(e);
                }
            });
        }
        const channel = await this.connectionManager.getChannelForPublishing();
        const response = await channel.sendToQueue(queue.name, Buffer.from(stringify(message.content)), message.options);
        return response;
    }

    async setup() {
        // TODO: put this into a promise, don't let 2 calls
        if (this.state.queue) {
            log(`Asserting ${this.state.queue}`);
            await this.connectionManager.assertQueue(this.state.queue)
            log(`Done asserting ${this.state.queue}`);
        }
        await promiseMap(this.state.exchanges, async (exchangery) => {
            log(`Asserting ${exchangery.exchange}`);
            await this.connectionManager.assertExchange(exchangery.exchange);
            if (this.state.queue) {
                const queue = this.state.queue;
                log(`Binding ${queue} to ${exchangery.exchange} using pattern ${exchangery.pattern}`);
                await this.connectionManager.bindQueue(exchangery.exchange, this.state.queue, exchangery.pattern);
            }
            log(`Done asserting ${exchangery.exchange}`);
        });
    }
}
