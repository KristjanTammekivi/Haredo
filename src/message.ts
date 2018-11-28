import { Consumer } from './consumer';
import { Message } from 'amqplib';

export class HaredoMessage<T = any> {

    private consumer: Consumer;

    public data: T;
    public dataString: string;
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
