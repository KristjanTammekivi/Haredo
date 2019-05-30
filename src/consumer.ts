import { ConnectionManager } from './connection-manager';
import { HaredoMessage } from './haredo-message';
import { Channel } from 'amqplib';
import { MessageManager } from './message-manager';
import { TypedEventEmitter } from './events';
import { EventEmitter } from 'events';
import { ChannelBrokenError, MessageAlreadyHandledError } from './errors';
import { swallowError, delay } from './utils';
import { FailHandlerOpts, FailHandler } from './fail-handler';

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
    },
    setterUpper: null
}

export interface MessageCallback<T = unknown> {
    (data: T, messageWrapper?: HaredoMessage<T>): any;
}

export interface ConsumerOpts {
    prefetch: number;
    autoAck: boolean;
    json: boolean;
    queueName: string;
    reestablish: boolean;
    fail: FailHandlerOpts;
    setterUpper: () => Promise<any>;
}

export interface ConsumerEvents {
    cancel: never;
    error: Error;
}

export class Consumer<T = any> {
    public channel: Channel;
    private prefetch: number;
    public cancelling = false;
    public cancelled = false;
    public cancelPromise: Promise<any>;
    private messageManager = new MessageManager<T>();
    public consumerTag: string;
    public setterUpper: () => Promise<any>;
    public readonly emitter = new EventEmitter() as TypedEventEmitter<ConsumerEvents>;

    private failHandler: FailHandler;

    constructor(
        private opts: ConsumerOpts,
        private connectionManager: ConnectionManager,
        private cb: MessageCallback<T>
    ) {
        this.prefetch = this.opts.prefetch;
        this.setterUpper = this.opts.setterUpper;
        this.failHandler = new FailHandler(this.opts.fail);
    }
    async start() {
        await this.setterUpper();
        this.channel = await this.connectionManager.getChannel();
        this.channel.once('close', async () => {
            this.channel = null;
            this.messageManager.channelBorked();
            if (this.opts.reestablish) {
                await delay(5);
                if (!this.cancelling) {
                    this.messageManager = new MessageManager();
                    this.start();
                }
            } else {
                this.messageManager.channelBorked();
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
                    await this.failHandler.getTicket();
                    const messageInstance = new HaredoMessage<T>(message, this.opts.json, this);
                    if (this.cancelled) {
                        return this.nack(messageInstance);
                    }
                    this.messageManager.add(messageInstance);
                    try {
                        await this.cb(messageInstance.data, messageInstance);
                        if (this.opts.autoAck) {
                            await swallowError(MessageAlreadyHandledError, messageInstance.ack(true));
                        }
                    } catch (e) {
                        this.emitter.emit('error', e)
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
        this.failHandler.fail();
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
