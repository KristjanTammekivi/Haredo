import { Message, MessagePropertyHeaders } from 'amqplib';
import { makeEmitter, TypedEventEmitter } from './events';

export interface HaredoMessageEvents {
    handled: void;
}

export interface HaredoMessage<TMessage = unknown, TReply = unknown> extends Methods<TReply> {
    emitter: TypedEventEmitter<HaredoMessageEvents>;
    raw: Message;
    data: TMessage;
    dataString: string;
    isHandled: () => boolean;
    isNacked: () => boolean;
    isAcked: () => boolean;
    isReplied: () => boolean;
    headers: MessagePropertyHeaders;
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
        headers: raw.properties.headers
    };
};
