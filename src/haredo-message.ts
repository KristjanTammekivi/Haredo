import { Message } from 'amqplib';
import { Consumer } from './consumer';
import { ChannelBrokenError, MessageAlreadyHandledError } from './errors';
import { EventEmitter } from 'events';
import { TypedEventEmitter } from './events';

export interface HaredoMessageEvents {
    handled: void;
}

export class HaredoMessage<T = unknown> {
    public data: T;
    public dataString: string;
    public isHandled = false;
    public isNacked = false;
    public isAcked = false;
    public channelBorked = false;
    public emitter = new EventEmitter as TypedEventEmitter<HaredoMessageEvents>;
    constructor(public readonly raw: Message, parseJson: boolean, public readonly consumer: Consumer) {
        this.dataString = raw.content.toString();
        if (parseJson) {
            this.data = JSON.parse(this.dataString);
        } else {
            this.data = this.dataString as any;
        }
    }
    async ack(suppressHandledError = false) {
        if (this.channelBorked) {
            throw new ChannelBrokenError('Channel was closed, cannot ack message', this);
        }
        if (this.isHandled) {
            if (suppressHandledError) {
                return;
            }
            throw new MessageAlreadyHandledError('A message can only be acked/nacked once');
        }
        this.isHandled = true;
        this.isAcked = true;
        await this.consumer.ack(this.raw);
        this.emitter.emit('handled');
    }
    async nack(requeue = true, suppressHandledError = false) {
        if (this.isHandled) {
            if (suppressHandledError) {
                return;
            }
            throw new MessageAlreadyHandledError('A message can only be acked/nacked once');
        }
        this.isHandled = true;
        await this.consumer.nack(this.raw, requeue);
        this.emitter.emit('handled');
    }
}