import { Message, MessagePropertyHeaders, MessageProperties, MessageFields } from 'amqplib';
import { makeEmitter, TypedEventEmitter } from './events';

export interface HaredoMessageEvents {
    handled: void;
}

export interface HaredoMessage<TMessage = unknown, TReply = unknown>
    extends Methods<TReply> {
    emitter: TypedEventEmitter<HaredoMessageEvents>;
    raw: Message;
    data: TMessage;
    dataString: string;
    isHandled: () => boolean;
    isNacked: () => boolean;
    isAcked: () => boolean;
    isReplied: () => boolean;
    headers: MessagePropertyHeaders;
    getHeader: (header: string) => string | string[];

    contentType?: string;
    contentEncoding?: string;
    deliveryMode?: 1 | 2;
    priority?: number;
    correlationId?: string;
    replyTo?: string;
    expiration?: number;
    messageId?: string;
    timestamp?: number;
    type?: string;
    userId?: string;
    appId?: string;

    messageCount?: number;
    consumerTag?: string;
    deliveryTag: number;
    redelivered: boolean;
    exchange: string;
    routingKey: string;
}

interface Methods<TReply = unknown> {
    ack: () => void;
    nack: (requeue: boolean) => void;
    reply: (message: TReply) => Promise<void>;
}

export const makeHaredoMessage = <TMessage = unknown, TReply = unknown>(
    raw: Message,
    parseJson: boolean,
    methods:
    Methods<TReply>
): HaredoMessage<TMessage, TReply> => {
    const state = {
        isHandled: false,
        isAcked: false,
        isNacked: false,
        isReplied: false,
    };

    const dataString = raw.content.toString();
    const data = parseJson ? JSON.parse(dataString) : dataString;

    const emitter = makeEmitter<HaredoMessageEvents>();
    return {
        emitter,
        raw,
        dataString,
        data,
        isHandled: () => state.isHandled,
        isAcked: () => state.isAcked,
        isNacked: () => state.isNacked,
        isReplied: () => state.isReplied,
        ack: () => {
            if (state.isHandled) {
                return;
            }
            state.isAcked = true;
            state.isHandled = true;
            methods.ack();
            emitter.emit('handled');
        },
        nack: (requeue: boolean) => {
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
            return methods.reply(message);
        },
        headers: raw.properties.headers,
        getHeader: (header: string) => raw.properties.headers[header],
        appId: raw.properties.appId,
        consumerTag: raw.fields.consumerTag,
        contentEncoding: raw.properties.contentEncoding,
        contentType: raw.properties.contentType,
        correlationId: raw.properties.correlationId,
        deliveryMode: raw.properties.deliveryMode,
        deliveryTag: raw.fields.deliveryTag,
        exchange: raw.fields.exchange,
        expiration: raw.properties.expiration,
        messageCount: raw.fields.messageCount,
        messageId: raw.properties.messageId,
        priority: raw.properties.priority,
        redelivered: raw.fields.redelivered,
        replyTo: raw.properties.replyTo,
        routingKey: raw.fields.routingKey,
        timestamp: raw.properties.timestamp,
        type: raw.properties.type,
        userId: raw.properties.userId
    };
};
