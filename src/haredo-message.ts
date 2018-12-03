import { Message, Channel } from 'amqplib';
import { EventEmitter } from 'events';
import { TypedEventEmitter } from './events';
import { Consumer } from './consumer';

export enum HaredoMessageEvents {
    MESSAGE_ACKED = 'ack',
    MESSAGE_NACKED = 'nack',
    MESSAGE_HANDLED = 'handled'
};

interface Events {
    ack: never;
    nack: never;
    handled: 'ACK' | 'NACK';
}

export class HaredoMessage<T = unknown> {

    private consumer: Consumer;

    public data: T;
    public dataString: string;
    public readonly emitter = new EventEmitter() as TypedEventEmitter<Events>;
    public readonly raw: Message;

    public isHandled: boolean;

    constructor(raw: Message, parseJson: boolean, consumer: Consumer) {
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
        this.emitter.emit(HaredoMessageEvents.MESSAGE_ACKED);
        this.emitter.emit(HaredoMessageEvents.MESSAGE_HANDLED, 'ACK');
        return this.consumer.ack(this.raw);
    }

    nack(requeue: boolean = true) {
        if (this.isHandled) {
            throw new Error('A message can only be acked/nacked once');
        }
        this.isHandled = true;
        this.emitter.emit(HaredoMessageEvents.MESSAGE_NACKED);
        this.emitter.emit(HaredoMessageEvents.MESSAGE_HANDLED, 'NACK');
        return this.consumer.nack(this.raw, requeue);
    }
}
