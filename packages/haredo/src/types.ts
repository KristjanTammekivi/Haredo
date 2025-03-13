import {
    AMQPTlsOptions,
    ExchangeParams,
    AMQPProperties,
    QueueParams,
    AMQPMessage,
    Field
} from '@cloudamqp/amqp-client';
import { Middleware } from './utils/apply-middleware';
import { FailureBackoff } from './backoffs';
import { TypedEventEmitter } from './utils/typed-event-emitter';
import { LogFunction } from './utils/logger';
export { Logger } from './utils/logger';

export interface HaredoEvents {
    connected: null;
    disconnected: null;
    'message:error': [error: Error, message: HaredoMessage];
    'message:ack': HaredoMessage;
    'message:nack': [requeue: boolean, message: HaredoMessage];
}

export interface ExtensionInterface {
    queue?: Record<string, <T>(...args: any[]) => QueueChain<T>>;
    exchange?: Record<string, <T>(...args: any[]) => ExchangeChain<T>>;
}

type AnyFunction = (...args: any) => any;

type ReplaceReturnType<T extends (...args: any) => any, NEW_RETURN> = (...args: Parameters<T>) => NEW_RETURN;

export type IterateExtension<T extends ExtensionInterface['queue'] | ExtensionInterface['exchange'], U> = {
    [K in keyof T]: ReplaceReturnType<T[K] & AnyFunction, U>;
};

export interface HaredoInstance<E extends ExtensionInterface = object> {
    /**
     * Connect to the broker
     */
    connect(): Promise<void>;
    exchange<T = unknown>(
        exchange: ExchangeInterface<T>
    ): ExchangeChain<T> & IterateExtension<E['exchange'], ExchangeChain<T>>;

    exchange<T = unknown>(
        exchange: string,
        type: ExchangeType,
        parameters?: ExchangeParams,
        args?: ExchangeArguments
    ): ExchangeChain<T> & IterateExtension<E['exchange'], ExchangeChain<T>>;
    queue<T = unknown>(queue: QueueInterface<T>): QueueChain<T> & IterateExtension<E['queue'], QueueChain<T>>;
    queue<T = unknown>(
        queue: string,
        params?: QueueParams,
        args?: QueueArguments
    ): QueueChain<T> & IterateExtension<E['queue'], QueueChain<T>>;
    /**
     * Cancel all consumers, wait for callbacks
     * to finish and close the connection to the broker.
     */
    close(force?: boolean): Promise<void>;
    emitter: TypedEventEmitter<HaredoEvents>;
}

export interface Extension {
    /**
     * Name of the function to be added to the chain.
     * For example 'cid' will add a cid method to the chain.
     * See src/examples/extensions.ts
     */
    name: string;
    /**
     * Implementation of the function to be added to the exchange chain.
     * On call it will be invoked with the current state of the chain
     * and should return a function that will be added to the chain.
     * The returned function will be invoked with the arguments passed
     * to the function on the chain and it should return the full state,
     * not just the modifications to the state.
     */
    exchange?(state: ExchangeChainState): (...args: any[]) => ExchangeChainState;
    /**
     * Implementation of the function to be added to the queue chain.
     * On call it will be invoked with the current state of the chain
     * and should return a function that will be added to the chain.
     * The returned function will be invoked with the arguments passed
     * to the function on the chain and it should return the full state,
     * not just the modifications to the state.
     */
    queue?(state: QueueChainState<unknown>): (...args: any[]) => QueueChainState<unknown>;
}

export interface HaredoOptions {
    url: string | RabbitUrl;
    /**
     * TLS options to use when connecting to the broker
     */
    tlsOptions?: AMQPTlsOptions;
    /**
     * Delay in milliseconds before trying to reconnect to the broker
     * after a connection failure.
     * @default 500
     */
    reconnectDelay?: number | ((attempt: number) => number);
    /**
     * Adapter to use for commands to the broker. Useful for testing.
     * @see https://www.npmjs.com/package/haredo-test-adapter
     */
    adapter?: Adapter;
    defaults?: {
        /**
         * The name of the application. This will be used as the appId when
         * publishing messages.
         */
        appId?: string;
        /**
         * The default concurrency to use for consumers. This can be overridden
         * by calling .concurrency (or it's alias, .prefetch) on the chain.
         */
        concurrency?: number;
    };
    /**
     * Additional methods to add to the chains.
     */
    extensions?: Extension[];
    /**
     * Add global middlewares to be run for all consumers
     */
    globalMiddleware?: Middleware[];
    log?: LogFunction;
}

export interface RabbitUrl {
    protocol: 'amqp' | 'amqps';
    username: string;
    password: string;
    hostname: string;
    port: number;
    vhost: string;
}

export interface SkipSetupOptions {
    /**
     * If true then don't create the exchanges that are bound to this queue / exchange
     */
    skipBoundExchanges?: boolean;
    /**
     * If true then don't create the queue / exchange
     */
    skipCreate?: boolean;
    /**
     * If true then don't create the bindings
     */
    skipBindings?: boolean;
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
    skipSetup(options?: SkipSetupOptions | boolean): this;
    /**
     * Always serialize messages as JSON. This will make the publish method
     * always serialize the message as JSON before sending it to the broker.
     * The subscribe method will always deserialize the message as JSON before
     * passing it to the callback.
     * @param [autoSerialize=true]
     */
    json(autoSerialize?: boolean): this;
    /**
     * Unbind an exchange from the exchange / queue.
     */
    unbindExchange(name: string, routingKey: string | string[], bindingArguments?: BindingArguments): Promise<void>;
    unbindExchange(
        name: ExchangeInterface,
        routingKey: string | string[],
        bindingArguments?: BindingArguments
    ): Promise<void>;
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
    /**
     * Set the message priority.
     * @see https://www.rabbitmq.com/priority.html
     */
    priority(priority: number): this;
    /**
     * Set a header on a message
     */
    setHeader(key: string, value: Field): this;
    /**
     * Set the message expiration time in milliseconds
     */
    expiration(milliseconds: number): this;
    /**
     * Publish a message to the exchange. Unless .json(false) has been called
     * the message will be serialized as JSON before being sent to the broker.
     */
    publish(message: T, routingKey: string): Promise<void>;
    /**
     * Set the x-delay header on the message. Used in combination with delayed
     * exchanges.
     */
    delay(milliseconds: number): ExchangeChain<T>;
    /**
     * Bind an exchange to the exchange. Unless .skipSetup has been called
     * the bound exchange will also be created during setup.
     */
    bindExchange(
        sourceExchange: string,
        routingKey: string | string[],
        type: ExchangeType,
        exchangeParams?: ExchangeParams,
        exchangeArguments?: ExchangeArguments,
        bindingArguments?: BindingArguments
    ): ExchangeChain<T>;
    bindExchange(
        sourceExchange: ExchangeInterface,
        routingKey: string | string[],
        bindingArguments?: BindingArguments
    ): ExchangeChain<T>;
    /**
     * Set an argument for publishing messages to the exchange.
     */
    setArgument<K extends keyof AMQPProperties>(key: K, value: AMQPProperties[K]): ExchangeChain<T>;
    /**
     * Delete the exchange
     */
    delete(options?: ExchangeDeleteOptions): Promise<void>;
}

export type SubscribeCallback<T> = (data: T, message: HaredoMessage<T>) => any;

export interface QueueChain<T = unknown> extends SharedChain, QueueSubscribeChain<T>, QueuePublishChain<T> {}

export interface QueuePublishChain<T> extends SharedChain {
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
    /**
     * Set the message priority.
     * @see https://www.rabbitmq.com/priority.html
     */
    priority(priority: number): QueuePublishChain<T>;
    /**
     * Set a header on a message
     */
    setHeader(key: string, value: string | number): QueuePublishChain<T>;
    /**
     * Set the message expiration time in milliseconds
     */
    expiration(milliseconds: number): QueuePublishChain<T>;
    /**
     * Send a message to the queue. Unless .json(false) has been called
     * the message will be serialized as JSON before being sent to the broker.
     */
    publish(message: T): Promise<void>;
    setPublishArgument<K extends keyof AMQPProperties>(key: K, value: AMQPProperties[K]): QueuePublishChain<T>;
    /**
     * Delete the queue
     */
    delete(options?: QueueDeleteOptions): Promise<void>;
    /**
     * Purge the queue. This will remove all messages from the queue.
     */
    purge(): Promise<void>;
}

export interface HaredoConsumer {
    /**
     * Cancel the consumer. This will stop the consumer from receiving any
     * more messages. After last message has been processed the promise will
     * resolve.
     */
    cancel(): Promise<void>;
}

export type RetentionUnit = 'Y' | 'M' | 'D' | 'h' | 'm' | 's';
export type Retention = `${ number }${ RetentionUnit }`;

export type StreamOffset = 'first' | 'last' | 'next' | number | Retention | Date;

export interface QueueSubscribeChain<T> extends SharedChain {
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
    bindExchange(
        name: string,
        routingKey: string | string[],
        type: ExchangeType,
        exchangeParams?: ExchangeParams,
        exchangeArguments?: ExchangeArguments,
        bindingArguments?: BindingArguments
    ): QueueSubscribeChain<T>;
    /**
     * Bind an exchange to the queue. This will also setup the exchange
     * (if skipSetup is called it will not be set up and bindings won't be made,
     * calling bindExchange and skipSetup together does not make sense)
     */
    bindExchange<TEXCHANGE = unknown>(
        exchange: ExchangeInterface<TEXCHANGE>,
        routingKey: string | string[],
        bindingArguments?: BindingArguments
    ): QueueSubscribeChain<Merge<T, TEXCHANGE>>;
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
    /**
     * Set the noAck mode true or false. When noAck is true the broker won't
     * expect an acknowledgement of messages delivered to this consumer.
     * @param noAck
     */
    noAck(noAck?: boolean): QueueSubscribeChain<T>;
    /**
     * Set the exclusive mode true or false. When exclusive is true the broker
     * won't let anyone else consume from this queue.
     * @param exclusive
     */
    exclusive(exclusive?: boolean): QueueSubscribeChain<T>;
}

export interface ChainState {
    emitter: TypedEventEmitter<HaredoEvents>;
    adapter: Adapter;
    skipSetup?: SkipSetupOptions;
    confirm?: boolean;
    json?: boolean;
    bindings?: { exchange: ExchangeInterface; patterns: string[]; bindingArguments?: BindingArguments | undefined }[];
    headers?: Record<string, Field>;
    publishOptions?: PublishOptions;
    appId?: string;
}

export interface QueueChainState<T> extends ChainState {
    queue: QueueInterface;
    middleware: Middleware<T>[];
    prefetch?: number;
    backoff?: FailureBackoff;
    subscribeArguments?: SubscribeArguments;
    noAck?: boolean;
    exclusive?: boolean;
}

export interface ExchangeChainState extends ChainState {
    exchange: ExchangeInterface;
}

export type Merge<T, U> = unknown extends T ? U : unknown extends U ? T : T | U;

export interface HaredoMessageEvents {
    ack: null;
    nack: boolean;
}

export interface HaredoMessage<T = unknown> extends Methods {
    _type: 'HaredoMessage';
    emitter: TypedEventEmitter<HaredoMessageEvents>;

    raw: AMQPMessage;
    /**
     * Message contents
     */
    data: T;
    /**
     * Unparsed message data
     */
    dataString: string | null;
    /**
     * Returns true if message has been acked/nacked
     */
    isHandled(): boolean;
    /**
     * Returns true if the message has been nacked
     */
    isNacked(): boolean;
    /**
     * Returns true if the message has been acked
     */
    isAcked(): boolean;
    /**
     * Headers of the message
     */
    headers: AMQPProperties['headers'];
    /**
     * Return the specified header
     * @param header header to return
     */
    getHeader<TFIELD = Field>(header: string): TFIELD;

    contentType?: string;
    contentEncoding?: string;
    /**
     * Either 1 for non-persistent or 2 for persistent
     */
    deliveryMode?: 1 | 2;
    /**
     * Priority of a message. See [priority queues](https://www.rabbitmq.com/priority.html)
     */
    priority?: number;
    /**
     * Used for RPC system to match messages to their replies
     */
    correlationId?: string;
    /**
     * Queue name to reply to for RPC
     */
    replyTo?: string;
    /**
     * If supplied, the message will be discarded from a queue once it's been there longer than the given number of milliseconds
     */
    expiration?: number;
    /**
     * Arbitrary application-specific identifier for the message
     */
    messageId?: string;
    /**
     * A timestamp for the message. Rounded to the nearest second when provided
     */
    timestamp?: Date;
    /**
     * An arbitrary application-specific type for the message
     */
    type?: string;
    /**
     * If supplied, RabbitMQ will compare it to the username supplied when opening the connection, and reject messages for which it does not match
     */
    userId?: string;
    /**
     * An arbitrary identifier for the originating application
     */
    appId?: string;

    /**
     * consumerTag of the consumer the message originates from
     */
    consumerTag?: string;
    /**
     * deliveryTag of the message (used to identify the message between consumer and broker)
     */
    deliveryTag: number;
    /**
     * True if the message has been sent to a consumer at least once
     */
    redelivered: boolean;
    /**
     * Name of the exchange the message originates from
     */
    exchange?: string;
    /**
     * Routingkey. If routingkey was not set then this equals to the name of the queue
     */
    routingKey?: string;
    /**
     * Name of the queue this message was consumed from
     */
    queue: string;
    /**
     * Amount of attempts the broker has done to deliver the message.
     * undefined on first attempt
     */
    deliveryCount: number | undefined;
    /**
     * Stream offset of the message. Only available for streams
     */
    streamOffset?: number;
}

export interface Methods {
    /**
     * Mark the message as done, removes it from the queue
     */
    ack(): Promise<void>;
    /**
     * Nack the message. If requeue is false (defaults to true)
     * then the message will be discarded. Otherwise it will be returned to
     * the front of the queue
     */
    nack(requeue?: boolean): Promise<void>;
}

export type StandardExchangeType = 'direct' | 'fanout' | 'topic' | 'headers';

export type ExchangeType = StandardExchangeType | 'x-delayed-message';

export interface KnownExchangeArguments {
    'alternate-exchange'?: string;
}

export type ExchangeArguments = Omit<Record<string, string | number>, keyof KnownExchangeArguments> &
    KnownExchangeArguments;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ExchangeInterface<T = unknown> {
    name: string;
    type: ExchangeType;
    params: ExchangeParams;
    args: ExchangeArguments;
    /**
     * Set the exchange as autoDelete.
     * AutoDelete exchanges will be deleted when there are no queues bound to it.
     */
    autoDelete(autoDelete?: boolean): this;
    /**
     * Set the exchange as durable. Durable exchanges will survive broker restarts.
     */
    durable(durable?: boolean): this;
    /**
     * Set the exchange as passive. Passive exchanges will not be created by the broker.
     */
    passive(passive?: boolean): this;
    /**
     * Set the alternate exchange for this exchange.
     * If a message cannot be routed to any queue
     * in this exchange, it will be sent to the alternate exchange.
     */
    alternateExchange(alternate: string | ExchangeInterface): this;
    /**
     * Set the exchange as delayed exchange
     */
    delayed(): this;
}

export type XOverflow = 'drop-head' | 'reject-publish' | 'reject-publish-dlx';

export interface KnownQueueArguments {
    /**
     * Maximum TTL for messages in the queue.
     */
    'message-ttl'?: number;
    /**
     * In case of messages being rejected or dead, they will be sent to the
     * specified exchange.
     */
    'x-dead-letter-exchange'?: string;
    /**
     * When paired with x-dead-letter-exchange this will be the routing key
     * for dead letter messages.
     */
    'x-dead-letter-routing-key'?: string;
    /**
     * The type of the queue.
     */
    'x-queue-type'?: 'classic' | 'quorum' | 'stream';
    /**
     * Maximum length of the queue. Overflow behavior is set with x-overflow.
     */
    'x-max-length'?: number;
    /**
     * Maximum length of the queue in bytes. Overflow behavior is set with x-overflow.
     */
    'x-max-length-bytes'?: number;
    /**
     * Overflow behavior for x-max-length and x-max-length-bytes.
     * @default 'drop-head'
     */
    'x-overflow'?: XOverflow;
    /**
     * Delete the queue after the given time in milliseconds of disuse.
     */
    'x-expires'?: number;
    /**
     * Maximum priority of the messages in the queue.
     * Larger numbers indicate higher priority.
     */
    'x-max-priority'?: number;
    /**
     * Maximum number of times a message in the queue will be delivered.
     * Only applicable to quorum queues.
     */
    'x-delivery-limit'?: number;
    /**
     * Set the queue to have a single active consumer.
     * See https://www.rabbitmq.com/consumers.html#single-active-consumer
     */
    'x-single-active-consumer'?: boolean;
    /**
     * Maximum age of the messages in the stream. Retention is only evaluated when
     * a new segment is added to the stream
     */
    'x-max-age'?: Retention;
    /**
     * A stream is divided up into fixed size segment files on disk. This setting controls the size of these. Default: (500000000 bytes).
     */
    'x-stream-max-segment-size-bytes'?: number;
}

export type QueueArguments = Omit<Record<string, string | number | boolean>, keyof KnownQueueArguments> &
    KnownQueueArguments;

export interface QueueInterface<TMESSAGE = unknown> {
    name: string | undefined;
    params: QueueParams;
    args: QueueArguments;
    setArgument(
        key: keyof QueueArguments,
        value: QueueArguments[keyof QueueArguments] | undefined
    ): QueueInterface<TMESSAGE>;
    /**
     * Set the queue type to quorum.
     * See https://www.rabbitmq.com/quorum-queues.html
     */
    quorum(): QueueInterface<TMESSAGE>;
    /**
     * Set the queue type to stream.
     * See https://www.rabbitmq.com/streams.html
     */
    stream(): QueueInterface<TMESSAGE>;
    /**
     * Set the queue to auto delete when the last consumer disconnects.
     * Not allowed for quorum queues or streams
     */
    autoDelete(autoDelete?: boolean): QueueInterface<TMESSAGE>;
    /**
     * Set the queue to be exclusive.
     * Exclusive queues can only be used by one connection
     * and will be deleted when the connection closes.
     */
    exclusive(exclusive?: boolean): QueueInterface<TMESSAGE>;
    /**
     * Set the queue to be durable.
     * Durable queues will survive a broker restart.
     */
    durable(durable?: boolean): QueueInterface<TMESSAGE>;
    /**
     * Set the queue to be passive.
     * Passive queues will not be created by the broker.
     */
    passive(passive?: boolean): QueueInterface<TMESSAGE>;
    /**
     * Set the dead letter exchange.
     */
    dead(deadLetterExchange: string | ExchangeInterface, rountingKey?: string): QueueInterface<TMESSAGE>;
    /**
     * Set message TTL. Messages in the queue will be expired after the TTL.
     * If dead letter exchange is set, expired messages will be sent to the
     * dead letter exchange.
     */
    messageTtl(ttl: number): QueueInterface<TMESSAGE>;
    /**
     * Set the max length of the queue.
     */
    maxLength(maxLength: number, overflowBehavior?: XOverflow): QueueInterface<TMESSAGE>;
    /**
     * Set the max length of the queue in bytes.
     */
    maxLengthBytes(maxLengthBytes: number, overflowBehavior?: XOverflow): QueueInterface<TMESSAGE>;
    /**
     * Delete the queue after the given time in milliseconds of disuse.
     */
    expires(ms: number): QueueInterface<TMESSAGE>;
    /**
     * Set maximum priority of the messages in the queue.
     * Larger numbers indicate higher priority.
     */
    maxPriority(priority: number): QueueInterface<TMESSAGE>;
    /**
     * Set the delivery limit of the queue.
     * Only applicable to quorum queues.
     */
    deliveryLimit(limit: number): QueueInterface<TMESSAGE>;
    /**
     * Set the queue to have a single active consumer.
     * See https://www.rabbitmq.com/consumers.html#single-active-consumer
     */
    singleActiveConsumer(): QueueInterface<TMESSAGE>;
    /**
     * Set the max age of the messages in the stream.
     * Retention is only evaluated when a new segment is added to the stream.
     * Valid units are: Y, M, D, h, m, s
     */
    maxAge(maxAge: Retention): QueueInterface<TMESSAGE>;
    /**
     * Set the max segment size of the stream.
     * A stream is divided up into fixed size segment files on disk.
     * This setting controls the size of these.
     * Default: (500_000_000 bytes).
     */
    streamMaxSegmentSize(bytes: number): QueueInterface<TMESSAGE>;
}

export interface SubscribeArguments {
    /**
     * The priority of the consumer.
     * Higher priority consumers get messages in preference to
     * lower priority consumers.
     */
    'x-priority'?: number;
    /**
     * x-stream-offset is used to specify the offset from which
     * the consumer should start reading from the stream.
     * The value can be a positive integer or a negative integer.
     * A positive integer specifies the offset from the beginning
     * of the stream. A negative integer specifies the offset from
     * the end of the stream.
     * @see https://www.rabbitmq.com/streams.html#consuming
     */
    'x-stream-offset'?: StreamOffset;
}

export interface SubscribeOptions {
    onClose: (reason: Error | null) => void;
    prefetch?: number;
    noAck?: boolean;
    exclusive?: boolean;
    parseJson?: boolean;
    args?: SubscribeArguments;
}
export interface Consumer {
    cancel(): Promise<void>;
}

export interface PublishOptions extends AMQPProperties {
    mandatory?: boolean;
    immediate?: boolean;
    confirm?: boolean;
}

export interface KnownBindingArguments {
    'x-match'?: 'all' | 'any';
}

export type BindingArguments = Omit<Record<string, string | number>, keyof KnownBindingArguments> &
    KnownBindingArguments;

export interface QueueDeleteOptions {
    /**
     * Only delete if the queue doesn't have any consumers
     */
    ifUnused?: boolean;
    /**
     * Only delete if the queue is empty
     */
    ifEmpty?: boolean;
}

export interface ExchangeDeleteOptions {
    /**
     * Only delete if the exchange doesn't have any bindings
     */
    ifUnused?: boolean;
}

export interface AdapterEvents {
    connected: null;
    disconnected: null;
}

export interface Adapter {
    emitter: TypedEventEmitter<AdapterEvents>;
    connect(): Promise<void>;
    close(force?: boolean): Promise<void>;
    createQueue(name: string | undefined, options?: QueueParams, args?: QueueArguments): Promise<string>;
    deleteQueue(name: string, options?: QueueDeleteOptions): Promise<void>;
    createExchange(name: string, type: string, options?: ExchangeParams, args?: ExchangeArguments): Promise<void>;
    deleteExchange(name: string, options?: ExchangeDeleteOptions): Promise<void>;
    bindQueue(queueName: string, exchangeName: string, routingKey?: string, args?: BindingArguments): Promise<void>;
    unbindQueue(queueName: string, exchangeName: string, routingKey?: string, args?: BindingArguments): Promise<void>;
    bindExchange(destination: string, source: string, routingKey?: string, args?: BindingArguments): Promise<void>;
    unbindExchange(destination: string, source: string, routingKey?: string, args?: BindingArguments): Promise<void>;
    sendToQueue(name: string, message: string, options: PublishOptions): Promise<void>;
    purgeQueue(name: string): Promise<void>;
    publish(exchange: string, routingKey: string, message: string, options: PublishOptions): Promise<void>;
    subscribe(
        name: string,
        options: SubscribeOptions,
        callback: (message: HaredoMessage<unknown>) => Promise<void>
    ): Promise<Consumer>;
}

export interface AdapterOptions {
    url: string | RabbitUrl;
    tlsOptions?: AMQPTlsOptions;
    /**
     * Add a delay between connection attempts.
     * @default 500
     */
    reconnectDelay?: number | ((attempt: number) => number);
}
