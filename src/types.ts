import { AMQPTlsOptions, ExchangeParams, AMQPProperties, QueueParams } from '@cloudamqp/amqp-client';
import { Adapter, PublishOptions, SubscribeArguments } from './adapter';
import { ExchangeArguments, ExchangeInterface, ExchangeType } from './exchange';
import { QueueArguments, QueueInterface } from './queue';
import { Middleware } from './utils/apply-middleware';
import { FailureBackoff } from './backoffs';
import { HaredoMessage } from './haredo-message';

export interface HaredoInstance {
    connect(): Promise<void>;
    exchange<T = unknown>(exchange: ExchangeInterface<T>): ExchangeChain<T>;

    exchange<T = unknown>(
        exchange: string,
        type: ExchangeType,
        parameters?: ExchangeParams,
        args?: ExchangeArguments
    ): ExchangeChain<T>;
    queue<T = unknown>(queue: QueueInterface<T>): QueueChain<T>;
    queue<T = unknown>(queue: string, params?: QueueParams, args?: QueueArguments): QueueChain<T>;
    close(): Promise<void>;
}

export interface HaredoOptions {
    url: string | RabbitUrl;
    tlsOptions?: AMQPTlsOptions;
    adapter?: Adapter;
    /**
     * The name of the application. This will be used as the appId when
     * publishing messages.
     */
    appId?: string;
}
export interface RabbitUrl {
    protocol: 'amqp' | 'amqps';
    username: string;
    password: string;
    hostname: string;
    port: number;
    vhost: string;
}

export interface SharedChain {
    /**
     * Set up the topology declared in the chain.
     * All exchanges / queues / bindings will be created.
     */
    setup(): Promise<void>;
    /**
     * Skip setup of the topology declared in the chain.
     * Normally all queues / exchanges / bindings will be created each time
     * subscribe / publish is called. This method will skip that step.
     */
    skipSetup(): this;
    /**
     * Always serialize messages as JSON. This will make the publish method
     * always serialize the message as JSON before sending it to the broker.
     * The subscribe method will always deserialize the message as JSON before
     * passing it to the callback.
     * @param [autoSerialize=true]
     */
    json(autoSerialize?: boolean): this;
}
export interface ExchangeChain<T = unknown> extends SharedChain {
    /**
     * Set the publish to use confirm mode. This will make the publish method
     * return a promise that will resolve when the message has been confirmed
     * as received by the broker.
     */
    confirm(): this;
    /**
     * Set an arbitrary type for the message.
     */
    type(type: string): this;
    publish(message: T, routingKey: string): Promise<void>;
    delay(milliseconds: number): ExchangeChain<T>;
    setArgument<K extends keyof AMQPProperties>(key: K, value: AMQPProperties[K]): ExchangeChain<T>;
}

export type SubscribeCallback<T> = (data: T, message: HaredoMessage<T>) => any;

export interface QueueChain<T = unknown> extends SharedChain, QueueSubscribeChain<T>, QueuePublishChain<T> {}

export interface QueuePublishChain<T> {
    /**
     * Set the publish to use confirm mode. This will make the publish method
     * return a promise that will resolve when the message has been confirmed
     * as received by the broker.
     */
    confirm(): QueuePublishChain<T>;
    /**
     * Set an arbitrary type for the message.
     */
    type(type: string): QueuePublishChain<T>;
    publish(message: T): Promise<void>;
    setPublishArgument<K extends keyof AMQPProperties>(key: K, value: AMQPProperties[K]): QueuePublishChain<T>;
}

export interface HaredoConsumer {
    /**
     * Cancel the consumer. This will stop the consumer from receiving any
     * more messages. After last message has been processed the promise will
     * resolve.
     */
    cancel(): Promise<void>;
}

type RetentionUnit = 'Y' | 'M' | 'D' | 'h' | 'm' | 's';
export type Retention = `${ number }${ RetentionUnit }`;

export type StreamOffset = 'first' | 'last' | 'next' | number | Retention | Date;

export interface QueueSubscribeChain<T> {
    /**
     * Subscribe to the queue. When .skipSetup has not been called this will
     * also set up the queue and any bound exchanges that may be present.
     */
    subscribe(callback: SubscribeCallback<T>): Promise<HaredoConsumer>;
    /**
     * Add middleware to the chain. Middleware will be called in the order
     * they are added. Middleware can be used to modify the message before
     * it is passed to the callback. Middleware can also be used to ack/nack
     * the message.
     *
     * Middleware is invoked with the message and a function
     * that returns a promise for the next item in the callback stack.
     * If you don't call it and don't ack/nack the message then it will be
     * called for you.
     */
    use(...middleware: Middleware<T>[]): QueueSubscribeChain<T>;
    /**
     * Set the number of messages to prefetch. This will be the maximum number
     * of concurrent messages that will be processed.
     * @alias prefetch
     * @param count The number of messages to prefetch
     */
    concurrency(count: number): QueueSubscribeChain<T>;
    /**
     * Set the number of messages to prefetch. This will be the maximum number
     * of concurrent messages that will be processed.
     * @alias concurrency
     * @param count The number of messages to prefetch
     */
    prefetch(count: number): QueueSubscribeChain<T>;
    /**
     * Set the backoff strategy to use when a message fails to process.
     * Currently the only bundled backoff strategy is standardBackoff
     */
    backoff(backoff: FailureBackoff): QueueSubscribeChain<T>;
    /**
     * Bind an exchange to the queue. This will also setup the exchange
     * (if skipSetup is called it will not be set up and bindings won't be made,
     * calling bindExchange and skipSetup together does not make sense)
     */
    bindExchange(name: string, routingKey: string | string[], type: ExchangeType): QueueSubscribeChain<T>;
    /**
     * Bind an exchange to the queue. This will also setup the exchange
     * (if skipSetup is called it will not be set up and bindings won't be made,
     * calling bindExchange and skipSetup together does not make sense)
     */
    bindExchange<TEXCHANGE = unknown>(
        exchange: ExchangeInterface<TEXCHANGE>,
        routingKey: string | string[]
    ): QueueSubscribeChain<Merge<T, TEXCHANGE>>;
    // TODO: max-age style interval
    // TODO: offset
    // TODO: timestamp
    /**
     * Set the offset to start reading from. This will only work with streams
     * The possible values are:
     * - 'first' - Start reading from the first message in the stream
     * - 'last' - Start reading from the last message in the stream
     * - 'next' - Start reading from the next message in the stream
     * - number - Start reading from the message with the given sequence number
     * - Interval - ie '7d' | '1h' | '30m' - Start reading from the message that was published the given interval ago
     * - Date - Start reading from the message that was published at the given date
     *
     * When using timestamp based offsets You might still get messages that were
     * published before the given timestamp.
     */
    streamOffset(offset: StreamOffset): QueueSubscribeChain<T>;
}

export interface ChainState {
    adapter: Adapter;
    skipSetup?: boolean;
    confirm?: boolean;
    json?: boolean;
    bindings?: { exchange: ExchangeInterface; patterns: string[] }[];
    headers?: Record<string, string | number>;
    publishOptions?: PublishOptions;
    appId?: string;
}

export interface QueueChainState<T> extends ChainState {
    queue: QueueInterface;
    middleware: Middleware<T>[];
    prefetch?: number;
    backoff?: FailureBackoff;
    subscribeArguments?: SubscribeArguments;
}

export interface ExchangeChainState extends ChainState {
    exchange: ExchangeInterface;
}

type Merge<T, U> = unknown extends T ? U : unknown extends U ? T : T | U;
