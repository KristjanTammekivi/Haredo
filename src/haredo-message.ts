import { Message, MessagePropertyHeaders } from 'amqplib';
import { Consumer } from './consumer';
import { MessageAlreadyHandledError, FailedParsingJsonError } from './errors';
import { EventEmitter } from 'events';
import { TypedEventEmitter } from './events';

export interface HaredoMessageEvents {
    handled: void;
}

export class HaredoMessage<T = unknown, U = unknown> {
    public data: T;
    public dataString: string;
    public isHandled = false;
    public isNacked = false;
    public isAcked = false;
    public isRespondedTo = false;
    public canReply: boolean;
    public haveReplied = false;
    public messageReply: U;
    public emitter = new EventEmitter as TypedEventEmitter<HaredoMessageEvents>;
    constructor(public readonly raw: Message, parseJson: boolean, public readonly consumer: Consumer) {
        this.dataString = raw.content.toString();
        if (parseJson) {
            try {
                this.data = JSON.parse(this.dataString);
            } catch (e) {
                throw new FailedParsingJsonError(this.dataString);
            }
        } else {
            this.data = this.dataString as any;
        }
        this.canReply = raw.properties.correlationId && raw.properties.replyTo;
    }
    /**
     * Return the headers for this message
     */
    getHeaders() {
        return this.raw.properties.headers;
    }
    /**
     * Return a specific header for the message
     */
    getHeader<T extends keyof MessagePropertyHeaders>(header: T): MessagePropertyHeaders[T] {
        return this.getHeaders()[header];
    }
    /**
     * Manually ack a message. Will throw an error if this message is already handled
     */
    ack() {
        if (this.isHandled) {
            throw new MessageAlreadyHandledError('A message can only be acked/nacked once');
        }
        this.consumer.ack(this);
        this.isHandled = true;
        this.isAcked = true;
        this.emitter.emit('handled');
    }
    /**
     * Manually nack a message. Will throw an error if message is already handled. If optional parameter
     * requeue is true (defaults to True) then the message is put back in the head of the queue
     */
    nack(requeue = true) {
        if (this.isHandled) {
            throw new MessageAlreadyHandledError('A message can only be acked/nacked once');
        }
        this.consumer.nack(this, requeue);
        this.isHandled = true;
        this.isNacked = true;
        this.emitter.emit('handled');
    }
    /**
     * Reply to a message via RPC, if message can be replied to (if message has a replyTo queue name and correlationId)
     *
     * Read more at [RabbitMQ Docs](https://www.rabbitmq.com/tutorials/tutorial-six-javascript.html)
     */
    reply(message: U) {
        if (!this.canReply) {
            return Promise.resolve();
        }
        if (this.haveReplied) {
            return Promise.resolve();
        }
        this.haveReplied = true;
        this.messageReply = message;
        return this.consumer.reply(this.raw.properties.replyTo, this.raw.properties.correlationId, message);
    }
    toString() {
        return `HaredoMessage ${ this.dataString }`;
    }
}
