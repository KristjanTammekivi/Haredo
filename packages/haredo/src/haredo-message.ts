import { AMQPMessage, Field } from '@cloudamqp/amqp-client';
import { parseJSON } from './utils/parse-json';
import { TypedEventEmitter } from './utils/typed-event-emitter';
import { HaredoMessage, HaredoMessageEvents, messageSymbol } from './types';

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
    const data = parseJson ? parseJSON<T>(dataString) : (dataString as T);

    const deliveryCount = raw.properties.headers?.['x-delivery-count'];

    const emitter = new TypedEventEmitter<HaredoMessageEvents>();

    return {
        _type: 'HaredoMessage',
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
        streamOffset: raw.properties.headers?.['x-stream-offset'] as number
    };
};
