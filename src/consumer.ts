import { ConnectionManager } from './connection-manager';
import { HaredoMessage } from './haredo-message';
import { Channel } from 'amqplib';
import { MessageManager } from './message-manager';
import { TypedEventEmitter } from './events';
import { EventEmitter } from 'events';
import { ChannelBrokenError, MessageAlreadyHandledError } from './errors';
import { delay, swallowError } from './utils';
import { FailHandlerOpts, FailHandler } from './fail-handler';
import { makeLogger } from './logger';

const { debug, error, info } = makeLogger('Consumer');

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
};

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
    'message-error': Error;
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
    /**
     * Start the consumer
     * */
    // tslint:disable-next-line:cognitive-complexity
    async start() {
        await this.setterUpper();
        this.channel = await this.connectionManager.getChannel();
        this.channel.once('close', async () => {
            info('channel closed');
            this.channel = null;
            this.messageManager.channelBorked();
            if (this.opts.reestablish) {
                await delay(5);
                try {
                    if (!this.cancelling) {
                        this.messageManager = new MessageManager();
                        await this.start();
                    }
                } catch (e) /* istanbul ignore next */ {
                    error('Failed to restart consumer', e);
                    this.emitter.emit('error', e);
                }
                return;
            }
            this.messageManager.channelBorked();
            await this.cancel();
        });
        if (this.opts.prefetch) {
            await this.setPrefetch(this.opts.prefetch);
        }
        const consumerInfo = await this.channel
            .consume(
                this.opts.queueName,
                async (message) => {
                    /* istanbul ignore if */
                    if (message === null) {
                        // Consumer got cancelled
                        return;
                    }
                    try {
                        const messageInstance = new HaredoMessage<T>(message, this.opts.json, this);
                        /* istanbul ignore if */
                        if (this.cancelling) {
                            return this.nack(messageInstance, true);
                        }
                        await this.failHandler.getTicket();
                        this.messageManager.add(messageInstance);
                        try {
                            await this.cb(messageInstance.data, messageInstance);
                            if (this.opts.autoAck) {
                                swallowError(MessageAlreadyHandledError, () =>  messageInstance.ack());
                            }
                        } catch (e) {
                            this.emitter.emit('message-error', e);
                            error('error processing message', e, messageInstance);
                            if (this.opts.autoAck) {
                                debug('autonacking message');
                                swallowError(MessageAlreadyHandledError, () => messageInstance.nack(true));
                            }
                        }
                    } catch (e) /* istanbul ignore next */ {
                        error('Uncaught consumer error', e);
                        this.emitter.emit('error', e);
                    }
                }
            );
        this.consumerTag = consumerInfo.consumerTag;
    }
    /**
     * Set the prefetch for the channel
     *
     * 0 means no prefetch limit
     */
    async setPrefetch(count: number) {
        // TODO: make sure you can actually change prefetch during consuming
        this.prefetch = count;
        await this.channel.prefetch(this.prefetch);

    }
    /**
     * ack a message, only to be used internally
     *
     * use message.ack() instead
     *
     * @example
     * haredo.queue('test').subscribe((data, haredoMessage) => {
     *   haredoMessage.ack();
     * });
     */
    ack(message: HaredoMessage<T>) {
        /* istanbul ignore if */
        if (!this.channel) {
            throw new ChannelBrokenError(message);
        }
        this.channel.ack(message.raw, false);
    }
    /**
     * nack a message, only to be used internally
    * @example
     * haredo.queue('test').subscribe((data, haredoMessage) => {
     *   haredoMessage.nack(false);
     * });
     */
    nack(message: HaredoMessage<T>, requeue: boolean) {
        this.failHandler.fail();
        /* istanbul ignore if */
        if (!this.channel) {
            throw new ChannelBrokenError(message);
        }
        this.channel.nack(message.raw, false, requeue);
    }
    /**
     * Cancel a consumer, wait for messages to finish processing
     * and then close the channel
     */
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
            info('consumer cancelled');
            this.emitter.emit('cancel');
            await this.messageManager.drain();
            await this.channel.close();
            info('consumer channel closed');
        } else {
            info('channel was already closed before cancel was called');
            this.emitter.emit('cancel');
        }
        this.cancelled = true;
    }
}
