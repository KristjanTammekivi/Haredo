import { Consumer } from './consumer';
import { Message } from 'amqplib';
import { EventEmitter } from 'events';

export enum MessageEvents {
    MESSAGE_ACKED = 'ack',
    MESSAGE_NACKED = 'nack',
    MESSAGE_HANDLED = 'handled'
};

type allEvents = MessageEvents.MESSAGE_ACKED |
    MessageEvents.MESSAGE_NACKED |
    MessageEvents.MESSAGE_HANDLED;

interface HaredoMessageEvents {
    on: (event: allEvents, listener: (...args: any[]) => void) => void;
    once: (event: allEvents, listener: (...args: any[]) => void) => void;
}

export class HaredoMessage<T = any> extends EventEmitter implements HaredoMessageEvents {

    private consumer: Consumer;

    public data: T;
    public dataString: string;
    public readonly raw: Message;

    public isHandled: boolean;

    constructor(raw: Message, parseJson: boolean, consumer: Consumer) {
        super();
        this.raw = raw;
        this.dataString = raw.content.toString();
        if (parseJson) {
            this.data = JSON.parse(this.dataString);
        } else {
            this.data = this.dataString as any;
        }
        this.consumer = consumer;
    }

    ack() {
        if (this.isHandled) {
            throw new Error('A message can only be acked/nacked once');
        }
        this.isHandled = true;
        this.emit(MessageEvents.MESSAGE_ACKED);
        this.emit(MessageEvents.MESSAGE_HANDLED, 'ACK');
        return this.consumer.ack(this.raw);
    }

    nack(requeue: boolean = true) {
        if (this.isHandled) {
            throw new Error('A message can only be acked/nacked once');
        }
        this.isHandled = true;
        this.emit(MessageEvents.MESSAGE_NACKED);
        this.emit(MessageEvents.MESSAGE_HANDLED, 'NACK');
        return this.consumer.nack(this.raw, requeue);
    }
}
