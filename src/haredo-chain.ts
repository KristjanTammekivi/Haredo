import { Queue } from './queue';
import { Exchange, ExchangeType, xDelayedTypeStrings, xDelayedTypesArray } from './exchange';
import { MergeTypes, stringify } from './utils';
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
    dlx: Exchange;
    dlq: Queue;
    dlqPattern: string;
    dlRoutingKey: string;
}

export class HaredoChain<T = unknown> {
    state: Partial<HaredoChainState<T>> = {};
    constructor(public connectionManager: ConnectionManager, state: Partial<HaredoChainState<T>>) {
        this.state.autoAck = state.autoAck === undefined ? true : !!state.autoAck;
        this.state.queue = state.queue;
        this.state.exchanges = [].concat(state.exchanges || []);
        this.state.prefetch = state.prefetch || 0;
        this.state.reestablish = !!state.reestablish;
        this.state.failSpan = state.failSpan;
        this.state.failThreshold = state.failThreshold;
        this.state.failTimeout = state.failTimeout;
        this.state.json = !!state.json || false;
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
    exchange<U>(exchange: string, type?: ExchangeType | xDelayedTypeStrings, pattern?: string): HaredoChain<MergeTypes<T, U>>
    exchange<U>(exchange: Exchange<U>, pattern?: ExchangeType | xDelayedTypeStrings | string): HaredoChain<MergeTypes<T, U>>
    exchange<U>(
        exchange: Exchange<U> | string,
        typeOrPattern: ExchangeType | xDelayedTypeStrings = ExchangeType.Direct,
        pattern: string = '#'
    ) {
        if (typeof exchange === 'string') {
            if (typeOrPattern !== undefined && !xDelayedTypesArray.includes(typeOrPattern as ExchangeType)) {
                throw new BadArgumentsError(`When .exchange is called with a string as first argument, the second argument must be a valid exchange type, received ${typeOrPattern}, expected one of ${xDelayedTypesArray.join(' | ')}`);
            }
            exchange = new Exchange(exchange, typeOrPattern);
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
    strictJson() {
        return this.clone({ json: true });
    }
    reestablish() {
        return this.clone({ reestablish: true });
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
    dead(deadLetterExchange: Exchange<T>, deadLetterQueue?: Queue<T>, pattern?: string): this;
    dead(deadLetterExchange: Exchange<T>, deadLetterRoutingKey: string, deadLetterQueue?: Queue<T>, pattern?: string): this;
    dead(deadLetterExchange: Exchange<T>, deadLetterRoutingKeyOrQueue?: string | Queue<T>, deadLetterQueueOrPattern?: string | Queue<T>, pattern?: string) {
        if (deadLetterRoutingKeyOrQueue instanceof Queue) {
            pattern = deadLetterQueueOrPattern as string;
            deadLetterQueueOrPattern = deadLetterRoutingKeyOrQueue;
        }
        return this.clone({ dlx: deadLetterExchange, dlq: deadLetterQueueOrPattern as Queue, dlRoutingKey: deadLetterRoutingKeyOrQueue as string, dlqPattern: pattern });
    }
    async subscribe(cb: MessageCallback<T>) {
        await this.setup();
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
            reestablish: this.state.reestablish
        }, this.connectionManager, cb);
        this.connectionManager.consumerManager.add(consumer);
        await consumer.start();
        return consumer;
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
            message = new PreparedMessage<T>({ content: message, routingKey, options });
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
        const channel = await this.connectionManager.getChannel();
        const response = await channel.publish(
            exchange.name,
            message.routingKey,
            Buffer.from(stringify(message.content)),
            message.options
        );
        await channel.close();
        return response;
    }

    private async publishToQueue(message: PreparedMessage<T>, queue: Queue<T>) {
        const channel = await this.connectionManager.getChannel();
        const response = await channel.sendToQueue(queue.name, Buffer.from(stringify(message.content)), message.options);
        await channel.close();
        return response;
    }

    async setup() {
        // TODO: put this into a promise, don't let 2 calls
        if (this.state.queue) {
            if (this.state.dlx) {
                let deadChain = new HaredoChain(this.connectionManager, {}).exchange(this.state.dlx);
                if (this.state.dlq) {
                    deadChain = deadChain.queue(this.state.dlq);
                }
                await deadChain.setup();
                this.state.queue = this.state.queue.dead(this.state.dlx, this.state.dlRoutingKey)
            }
            log(`Asserting ${this.state.queue}`);
            await this.connectionManager.assertQueue(this.state.queue)
            log(`Done asserting ${this.state.queue}`);
        }
        for (const exchangery of this.state.exchanges) {
            log(`Asserting ${exchangery.exchange}`);
            await this.connectionManager.assertExchange(exchangery.exchange);
            if (this.state.queue) {
                const queue = this.state.queue;
                log(`Binding ${queue} to ${exchangery.exchange} using pattern ${exchangery.pattern}`);
                await this.connectionManager.bindQueue(exchangery.exchange, this.state.queue, exchangery.pattern);
            }
            log(`Done asserting ${exchangery.exchange}`);
        }
    }
}