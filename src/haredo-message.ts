import { Message, MessagePropertyHeaders } from 'amqplib';
import { makeEmitter, TypedEventEmitter } from './events';
import { parseJSON } from './utils';

export interface HaredoMessageEvents {
    handled: void;
}

export interface HaredoMessage<TMessage = unknown, TReply = unknown> extends Methods<TReply> {
    metaType: 'message';
    emitter: TypedEventEmitter<HaredoMessageEvents>;
    /**
     * Raw message from amqplib
     */
    raw: Message;
    /**
     * Message contents
     */
    data: TMessage;
    /**
     * Unparsed message data
     */
    dataString: string;
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
     * Returns true if the message has been replied to (RPC)
     */
    isReplied(): boolean;
    /**
     * Returns the reply that was sent ack (RPC)
     */
    getReply(): TReply;
    /**
     * Headers of the message
     */
    headers: MessagePropertyHeaders;
    /**
     * Return the specified header
     * @param header header to return
     */
    getHeader(header: string): string | string[];

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
     * If supplied, the message will be discarded from a queue once it’s been there longer than the given number of milliseconds
     */
    expiration?: number;
    /**
     * Arbitrary application-specific identifier for the message
     */
    messageId?: string;
    /**
     * A timestamp for the message
     */
    timestamp?: number;
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

export interface Methods<TReply = unknown> {
    /**
     * Mark the message as done, removes it from the queue
     */
    ack(): void;
    /**
     * Nack the message. If requeue is false (defaults to true)
     * then the message will be discarded. Otherwise it will be returned to
     * the front of the queue
     */
    nack(requeue?: boolean): void;
    /**
     * Reply to the message. Only works if the message has a
     * replyTo and correlationId have been set on the message.
     * If autoReply has been set on the chain, then You can just return a
     * non-undefined value from the subscribe callback
     */
    reply(message: TReply): Promise<void>;
}

export const makeHaredoMessage = <TMessage = unknown, TReply = unknown>(
    raw: Message,
    parseJson: boolean,
    queue: string,
    methods: Methods<TReply>
): HaredoMessage<TMessage, TReply> => {
    const state = {
        isHandled: false,
        isAcked: false,
        isNacked: false,
        isReplied: false,
        reply: undefined as TReply,
    };

    const dataString = raw.content.toString();
    const data = parseJson ? parseJSON(dataString) : dataString;

    const emitter = makeEmitter<HaredoMessageEvents>();
    return {
        emitter,
        raw,
        dataString,
        data,
        queue,
        isHandled: () => state.isHandled,
        isAcked: () => state.isAcked,
        isNacked: () => state.isNacked,
        isReplied: () => state.isReplied,
        getReply: () => state.reply,
        ack: () => {
            if (state.isHandled) {
                return;
            }
            state.isAcked = true;
            state.isHandled = true;
            methods.ack();
            emitter.emit('handled');
        },
        nack: (requeue = true) => {
            if (state.isHandled) {
                return;
            }
            state.isNacked = true;
            state.isHandled = true;
            methods.nack(requeue);
            emitter.emit('handled');
        },
        reply: (message: TReply) => {
            state.isReplied = true;
            state.reply = message;
            return methods.reply(message);
        },
        getHeader: (header: string) => raw.properties.headers[header],
        headers: raw.properties.headers,
        appId: raw.properties.appId,
        consumerTag: raw.fields.consumerTag,
        contentEncoding: raw.properties.contentEncoding,
        contentType: raw.properties.contentType,
        correlationId: raw.properties.correlationId,
        deliveryMode: raw.properties.deliveryMode,
        deliveryTag: raw.fields.deliveryTag,
        exchange: raw.fields.exchange,
        expiration: raw.properties.expiration,
        messageId: raw.properties.messageId,
        priority: raw.properties.priority,
        redelivered: raw.fields.redelivered,
        replyTo: raw.properties.replyTo,
        routingKey: raw.fields.routingKey,
        timestamp: raw.properties.timestamp,
        type: raw.properties.type,
        userId: raw.properties.userId,
        metaType: 'message',
        deliveryCount: raw.properties.headers['x-delivery-count']
    };
};

/**
 * Returns true if passed in object is an message. Acts as a type guard for Message.
 * @param obj Object to check
 */
export const isHaredoMessage = (obj: any): obj is Message => {
    return obj?.metaType === 'message';
};
