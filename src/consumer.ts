import { ConnectionManager } from './connection-manager';
import { HaredoMessage } from './haredo-message';
import { Channel } from 'amqplib';
import { MessageManager } from './message-manager';
import { TypedEventEmitter } from './events';
import { EventEmitter } from 'events';
import { ChannelBrokenError, MessageAlreadyHandledError } from './errors';

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
    cancel: never;
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
            this.channel = null;
            this.messageManager.channelBorked();
            if (this.opts.reestablish && !this.cancelling) {
                this.messageManager = new MessageManager();
                this.start();
            } else {
                this.cancel();
            }
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
                    const messageInstance = new HaredoMessage<T>(message, this.opts.json, this);
                    if (this.cancelled) {
                        return this.nack(messageInstance);
                    }
                    this.messageManager.add(messageInstance);
                    try {
                        await this.cb(messageInstance);
                        if (this.opts.autoAck) {
                            await swallowError(MessageAlreadyHandledError, messageInstance.ack(true));
                        }
                    } catch (e) {
                        if (this.opts.autoAck) {
                            await swallowError(MessageAlreadyHandledError, messageInstance.nack(true, true));
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
    async ack(message: HaredoMessage<T>) {
        if (!this.channel) {
            throw new ChannelBrokenError(message);
        }
        await this.channel.ack(message.raw, false);
    }
    async nack(message: HaredoMessage<T>, requeue = true) {
        if (!this.channel) {
            throw new ChannelBrokenError(message);
        }
        await this.channel.nack(message.raw, false, requeue);
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
        if (this.channel) {
            await this.channel.cancel(this.consumerTag);
            this.emitter.emit('cancel');
            await this.messageManager.drain();
            await this.channel.close();
        } else {
            this.emitter.emit('cancel');
        }
        this.cancelled = true;
    }
}

const swallowError = async <T>(error: { new(): Error }, promise: Promise<T>): Promise<T | undefined> => {
    try {
        return await promise;
    } catch (e) {
        if (!(e instanceof error)) {
            throw e;
        }
    }
};
