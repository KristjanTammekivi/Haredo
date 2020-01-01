import { ConnectionManager } from './connection-manager';
import { HaredoMessage } from './haredo-message';
import { Channel, Message } from 'amqplib';
import { MessageManager } from './message-manager';
import { TypedEventEmitter } from './events';
import { EventEmitter } from 'events';
import { ChannelBrokenError, MessageAlreadyHandledError, FailedParsingJsonError } from './errors';
import { delay, swallowError, head, tail } from './utils';
import { FailHandlerOpts, FailHandler } from './fail-handler';
import { makeLogger } from './logger';
import { Queue } from './queue';
import {  HaredoChain } from './haredo-chain';
import { Middleware, HaredoChainState } from './state';
import { PreparedMessage } from './prepared-message';

const { debug, error, info } = makeLogger('Consumer');

export interface MessageCallback<TMessage = unknown, TReply = unknown> {
    (data: TMessage, messageWrapper?: HaredoMessage<TMessage>): TReply | Promise<TReply> | void;
}

export interface ConsumerOpts<T> {
    prefetch: number;
    autoAck: boolean;
    autoReply: boolean;
    json: boolean;
    queue: Queue;
    reestablish: boolean;
    fail: FailHandlerOpts;
    setup: () => Promise<any>;
    middleware: Middleware<T>[];
}

export interface ConsumerEvents {
    cancel: never;
    error: Error;
    'message-error': Error;
}

export class Consumer<T = unknown, U = unknown> {
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
        private opts: ConsumerOpts<T>,
        private connectionManager: ConnectionManager,
        private cb: MessageCallback<T>
    ) {
        this.prefetch = this.opts.prefetch;
        this.setterUpper = this.opts.setup;
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
            await this.cancel();
        });
        if (this.opts.prefetch) {
            await this.setPrefetch(this.opts.prefetch);
        }
        const consumerInfo = await this.channel
            .consume(
                this.opts.queue.name,
                async (message) => {
                    /* istanbul ignore if */
                    if (message === null) {
                        // Consumer got cancelled
                        return;
                    }
                    try {
                        const messageInstance = new HaredoMessage<T, U>(message, this.opts.json, this);
                        /* istanbul ignore if */
                        if (this.cancelling) {
                            return this.nack(messageInstance, true);
                        }
                        await this.failHandler.getTicket();
                        this.messageManager.add(messageInstance);
                        try {
                            await applyMiddleware(this.opts.middleware, this.cb, messageInstance);
                            if (this.opts.autoReply && messageInstance.messageReply !== undefined) {
                                await messageInstance.reply(messageInstance.messageReply);
                            }
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
                        if (e instanceof FailedParsingJsonError) {
                            this.nack(message, false);
                        }
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
            throw new ChannelBrokenError();
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
    nack(message: HaredoMessage<T> | Message, requeue: boolean) {
        if (message instanceof HaredoMessage) {
            this.failHandler.fail();
        }
        /* istanbul ignore if */
        if (!this.channel) {
            throw new ChannelBrokenError();
        }
        this.channel.nack(message instanceof HaredoMessage ? message.raw : message, false, requeue);
    }
    /**
     * reply to a message
     */
    async reply(replyTo: string, correlationId: string, message: U) {
        const msg = new PreparedMessage().correlationId(correlationId).json(message);
        await new HaredoChain(this.connectionManager, {} as HaredoChainState<U>)
            .queue(replyTo)
            .skipSetup()
            .json(this.opts.json)
            .publish(msg);
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

export const applyMiddleware = async <T>(middleware: Middleware<T>[], cb: MessageCallback<T>, msg: HaredoMessage<T>) => {
    if (!middleware.length) {
        // tslint:disable-next-line:no-invalid-await
        const response = await cb(msg.data, msg);
        if (response !== undefined) {
            msg.messageReply = response;
        }
    } else {
        let nextWasCalled = false;
        await head(middleware)(msg, () => {
            nextWasCalled = true;
            if (msg.isHandled) {
                error('Message was handled in the middleware but middleware called next() anyway');
                return;
            }
            return applyMiddleware(tail(middleware), cb, msg);
        });
        if (!nextWasCalled && !msg.isHandled) {
            await applyMiddleware(tail(middleware), cb, msg);
        }
    }
};
