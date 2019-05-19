import { Message } from 'amqplib';
import { Consumer } from './consumer';
import { HaredoError } from './errors';

export class HaredoMessage<T = unknown> {
    public data: T;
    public dataString: string;
    public isHandled = true;
    constructor(public readonly raw: Message, parseJson: boolean, public readonly consumer: Consumer) {
        this.dataString = raw.content.toString();
        if (parseJson) {
            this.data = JSON.parse(this.dataString);
        } else {
            this.data = this.dataString as any;
        }
    }
    async ack(suppressHandledError = false) {
        if (this.isHandled) {
            if (suppressHandledError) {
                return;
            }
            throw new HaredoError('A message can only be acked/nacked once');
        }
        this.isHandled = true;
        return this.consumer.ack(this.raw);
    }
    async nack(requeue = true, suppressHandledError = false) {
        if (this.isHandled) {
            if (suppressHandledError) {
                return;
            }
            throw new HaredoError('A message can only be acked/nacked once');
        }
        this.isHandled = true;
        return this.consumer.nack(this.raw, requeue);
    }
}