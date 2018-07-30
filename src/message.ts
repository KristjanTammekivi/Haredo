import { Consumer } from './consumer';
import { Message } from 'amqplib';

export class HaredoMessage {

    private consumer: Consumer;

    public data: string;
    public readonly raw: Message;

    public isHandled: boolean;

    constructor(raw: Message, consumer: Consumer) {
        this.raw = raw;
        this.data = raw.content.toString();
        this.consumer = consumer;
    }

    ack() {
        if (this.isHandled) {
            throw new Error('A message can only be acked/nacked once');
        }
        this.isHandled = true;
        return this.consumer.ack(this.raw);
    }

    nack(requeue: boolean = true) {
        if (this.isHandled) {
            throw new Error('A message can only be acked/nacked once');
        }
        this.isHandled = true;
        return this.consumer.nack(this.raw, requeue);
    }
}
