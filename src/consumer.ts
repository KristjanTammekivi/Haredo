import { HaredoMessage, makeHaredoMessage, Methods } from './haredo-message';
import { Queue } from './queue';
import { Middleware, Loggers } from './state';
import { Channel, Replies } from 'amqplib';
import { ConnectionManager } from './connection-manager';
import { delay } from 'bluebird';
import { makeEmitter, TypedEventEmitter } from './events';
import { ChannelBrokenError } from './errors';
import { initialChain } from './haredo';
import { head, tail } from './utils';
import { makeMessageManager } from './message-manager';
import { FailureBackoff } from './backoffs';

export interface MessageCallback<TMessage = unknown, TReply = unknown> {
    (message: HaredoMessage<TMessage, TReply>): Promise<TReply | void> | TReply | void;
}

export interface ConsumerOpts {
    prefetch: number;
    autoAck: boolean;
    autoReply: boolean;
    json: boolean;
    queue: Queue;
    reestablish: boolean;
    noAck: boolean;
    priority: number;
    exclusive: boolean;
    backoff: FailureBackoff;
    setup(): Promise<any>;
    middleware: Middleware<unknown, unknown>[];
}

export interface ConsumerEvents {
    close: never;
    reestablished: never;
    error: Error;
    'message-error': Error;
}

export interface Consumer {
    emitter: TypedEventEmitter<ConsumerEvents>;
    isClosing: boolean;
    isClosed: boolean;
    /**
     * Wait for all current messages to finish and then close the consumer
     */
    close(): Promise<void>;
    /**
     * Change the prefetch
     * @param prefetch Amount of messages to be unacked in the consumer
     */
    prefetch(prefetch: number): Replies.Empty;
}

export const makeConsumer = async <TMessage = unknown, TReply = unknown>(
    cb: MessageCallback<TMessage, TReply>,
    connectionManager: ConnectionManager,
    opts: ConsumerOpts,
    log: Loggers
): Promise<Consumer> => {
    let channel: Channel;
    let messageManager = makeMessageManager(log);
    let consumerTag: string;
    const emitter = makeEmitter<ConsumerEvents>();
    const { noAck, exclusive, priority } = opts;
    const close = async () => {
        consumer.isClosing = true;
        if (consumerTag && channel) {
            await channel.cancel(consumerTag);
        }
        await messageManager.drain();
        emitter.emit('close');
        consumer.isClosed = true;
    };
    const setPrefetch = (prefetch: number) => {
        return channel.prefetch(prefetch, true);
    };
    const start = async () => {
        await opts.setup();
        channel = await connectionManager.getChannel();
        channel.once('close', async () => {
            log.info({ component: 'Consumer', msg: 'channel closed' });
            channel = null;
            if (opts.reestablish) {
                await delay(5);
                try {
                    if (!consumer.isClosing) {
                        messageManager = makeMessageManager(log);
                        await start();
                        emitter.emit('reestablished');
                    }
                } catch (error) {
                    // TODO: attempt again
                    log.error({ component: 'Consumer', msg: 'Failed to restart consumer', error });
                    emitter.emit('error', error);
                }
            } else if (!consumer.isClosing) {
                await close();
            }
        });
        await setPrefetch(opts.prefetch || 0);
        ({ consumerTag } = await channel.consume(opts.queue.getName(), async (message) => {
            if (message === null) {
                return;
            }
            await opts.backoff?.take();
            let messageInstance: HaredoMessage<TMessage, TReply>;
            const methods: Methods<TReply> = {
                ack: () => {
                    /* istanbul ignore if */
                    if (!channel) {
                        throw new ChannelBrokenError();
                    }
                    if (!noAck) {
                        channel.ack(message);
                    }
                    opts.backoff?.ack?.();
                },
                nack: (requeue = true) => {
                    /* istanbul ignore if */
                    if (!channel) {
                        throw new ChannelBrokenError();
                    }
                    if (!noAck) {
                        channel.nack(message, false, requeue);
                    }
                    opts.backoff?.nack?.(requeue);
                },
                reply: async (reply) => {
                    if (!(message.properties.replyTo && message.properties.correlationId)) {
                        return;
                    }
                    await initialChain({ connectionManager })
                        .queue(message.properties.replyTo)
                        .skipSetup()
                        .confirm()
                        .publish(opts.json ? JSON.stringify(reply) : reply, {
                            correlationId: message.properties.correlationId
                        });
                }
            };
            try {
                if (consumer.isClosing) {
                    return;
                }
                messageInstance = makeHaredoMessage<TMessage, TReply>(message, opts.json, opts.queue.getName(), methods);
                messageManager.add(messageInstance);
                await applyMiddleware(opts.middleware || [], cb, messageInstance, opts.autoAck, opts.autoReply, log);
                opts.backoff?.pass?.();
            } catch (error) {
                opts.backoff?.fail?.(error);
                if (!messageInstance) {
                    log.error({ component: 'Consumer', error, msg: 'failed initializing a message instance', rawMessage: message });
                    methods.nack(false);
                } else {
                    log.error({ component: 'Consumer', error, msg: 'error while handling message', message: messageInstance, rawMessage: message });
                    if (!noAck) {
                        messageInstance.nack(true);
                    }
                }
            }
        }, { noAck, priority, exclusive }));
    };
    const consumer = {
        close,
        emitter,
        isClosed: false,
        isClosing: false,
        prefetch: setPrefetch
    };
    await start();
    return consumer;
};

export const applyMiddleware = async <TMessage, TReply>(middleware: Middleware<TMessage, TReply>[], cb: MessageCallback<TMessage, TReply>, msg: HaredoMessage<TMessage, TReply>, autoAck: boolean, autoReply: boolean, log: Loggers) => {
    if (!middleware.length) {
        const response = await cb(msg);
        if (typeof response !== 'undefined' && autoReply) {
            await msg.reply(response);
        }
        if (autoAck) {
            msg.ack();
        }
    } else {
        let nextWasCalled = false;
        await head(middleware)(msg, () => {
            nextWasCalled = true;
            if (msg.isHandled()) {
                log.warning({ component: 'Consumer', msg: 'message was handled in the middleware but middleware called next() anyway', message: msg, rawMessage: msg.raw });
                return;
            }
            return applyMiddleware(tail(middleware), cb, msg, autoAck, autoReply, log);
        });
        if (!nextWasCalled && !msg.isHandled()) {
            await applyMiddleware(tail(middleware), cb, msg, autoAck, autoReply, log);
        }
    }
};
