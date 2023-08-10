import { AMQPMessage, AMQPProperties, Field } from '@cloudamqp/amqp-client';
import { parseJSON } from './utils/parse-json';
import { TypedEventEmitter } from './utils/typed-event-target';

const messageSymbol = Symbol('message');

interface HaredoMessageEvents {
    ack: null;
    nack: boolean;
}

export interface HaredoMessage<T = unknown> extends Methods {
    [messageSymbol]: true;
    emitter: TypedEventEmitter<HaredoMessageEvents>;

    /**
     * Raw message from amqplib
     */
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
     * A timestamp for the message
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
     * Amount of attempts the broker has done to deliver the message
     */
    deliveryCount?: number;
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

export const makeHaredoMessage = <T = unknown>(
    raw: AMQPMessage,
    parseJson: boolean,
    queue: string
): HaredoMessage<T> => {
    const state = {
        isHandled: false,
        isAcked: false,
        isNacked: false
    };

    const dataString = raw.bodyString();
    const data = parseJson ? (parseJSON<T>(dataString) as T) : (dataString as T);

    const deliveryCount = raw.properties.headers?.['x-delivery-count'];

    const emitter = new TypedEventEmitter<HaredoMessageEvents>();

    return {
        raw,
        dataString,
        data,
        queue,
        emitter,
        isHandled: () => state.isHandled,
        isAcked: () => state.isAcked,
        isNacked: () => state.isNacked,
        ack: async () => {
            if (state.isHandled) {
                return;
            }
            state.isAcked = true;
            state.isHandled = true;
            await raw.ack();
            emitter.emit('ack', null);
        },
        nack: async (requeue = true) => {
            if (state.isHandled) {
                return;
            }
            state.isNacked = true;
            state.isHandled = true;
            await raw.nack(requeue);
            emitter.emit('nack', requeue);
        },
        getHeader: <TFIELD = Field>(header: string) => raw.properties.headers?.[header] as TFIELD,
        headers: raw.properties.headers,
        appId: raw.properties.appId,
        consumerTag: raw.consumerTag,
        contentEncoding: raw.properties.contentEncoding,
        contentType: raw.properties.contentType,
        correlationId: raw.properties.correlationId,
        deliveryMode: raw.properties.deliveryMode as 1 | 2,
        deliveryTag: raw.deliveryTag,
        exchange: raw.exchange,
        expiration: raw.properties.expiration ? Number(raw.properties.expiration) : undefined,
        messageId: raw.properties.messageId,
        priority: raw.properties.priority,
        redelivered: raw.redelivered,
        replyTo: raw.properties.replyTo,
        routingKey: raw.routingKey,
        timestamp: raw.properties.timestamp,
        type: raw.properties.type,
        userId: raw.properties.userId,
        deliveryCount: deliveryCount && !Number.isNaN(Number(deliveryCount)) ? Number(deliveryCount) : undefined,
        [messageSymbol]: true
    };
};

/**
 * Returns true if passed in object is a haredo message
 * @param {any} object Object to check
 * @returns {boolean} isMessage
 */
export const isHaredoMessage = (object: any): object is HaredoMessage => {
    return object?.[messageSymbol] || false;
};
