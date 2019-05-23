import { ConnectionManager } from './connection-manager';
import { HaredoMessage } from './haredo-message';
import { Message, Channel } from 'amqplib';
import { MessageManager } from './message-manager';
import { TypedEventEmitter } from './events';
import { EventEmitter } from 'events';

const CONSUMER_DEFAULTS: ConsumerOpts = {
    autoAck: true,
    prefetch: 0,
    reestablish: false,
    json: false,
    queueName: '',
    fail: {
        failSpan: 5000,
        failThreshold: Infinity,
        failTimeout: 5000
    }
}

export interface MessageCallback<T = unknown> {
    (message: HaredoMessage<T>): any;
}

export interface FailHandlerOpts {
    failSpan: number;
    failThreshold: number;
    failTimeout: number;
}

export interface ConsumerOpts {
    prefetch: number;
    autoAck: boolean;
    json: boolean;
    queueName: string;
    reestablish: boolean;
    fail: FailHandlerOpts;
}

export interface ConsumerEvents {
    cancel: void;
}

export class Consumer<T = any> {
    public channel: Channel;
    private prefetch: number;
    public cancelling = false;
    public cancelled = false;
    public cancelPromise: Promise<any>;
    private messageManager = new MessageManager<T>();
    public consumerTag: string;
    public readonly emitter = new EventEmitter() as TypedEventEmitter<ConsumerEvents>;
    constructor(
        private opts: ConsumerOpts,
        private connectionManager: ConnectionManager,
        private cb: MessageCallback<T>
    ) {
        this.prefetch = this.opts.prefetch;
    }
    async start() {
        this.channel = await this.connectionManager.getChannel();
        this.channel.once('close', async () => {
            // TODO: reestablish
            this.channel = null;
        });
        if (this.opts.prefetch) {
            await this.setPrefetch(this.opts.prefetch);
        }
        const consumerInfo = await this.channel
            .consume(
                this.opts.queueName,
                async (message) => {
                    if (message === null) {
                        // TODO: consumer got cancelled
                        // should I do something extra here
                        return;
                    }
                    if (this.cancelled) {
                        return this.nack(message);
                    }
                    const messageInstance = new HaredoMessage<T>(message, this.opts.json, this);
                    this.messageManager.add(messageInstance);
                    try {
                        await this.cb(messageInstance);
                        if (this.opts.autoAck) {
                            await messageInstance.ack(true);
                        }
                    } catch (e) {
                        if (this.opts.autoAck) {
                            await messageInstance.nack(true, true);
                        }
                    }
                }
            );
        this.consumerTag = consumerInfo.consumerTag;
    }
    async setPrefetch(count: number) {
        // TODO: make sure you can actually change prefetch during consuming
        this.prefetch = count;
        await this.channel.prefetch(this.prefetch);

    }
    async ack(message: Message) {
        await this.channel.ack(message, false);
    }
    async nack(message: Message, requeue = true) {
        await this.channel.nack(message, false, requeue);
    }
    cancel() {
        if (this.cancelPromise) {
            return this.cancelPromise;
        }
        this.cancelling = true;
        this.cancelPromise = this.internalCancel();
        return this.cancelPromise;
    }
    private async internalCancel() {
        await this.channel.cancel(this.consumerTag);
        await this.messageManager.drain();
        this.emitter.emit('cancel');
        await this.channel.close();
    }
}
