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

export interface MessageCallback<TMessage = unknown, TReply = unknown> {
    (message: HaredoMessage<TMessage>): Promise<TReply | void> | TReply | void;
}

export interface ConsumerOpts {
    prefetch: number;
    autoAck: boolean;
    autoReply: boolean;
    json: boolean;
    queue: Queue;
    reestablish: boolean;
    setup: () => Promise<any>;
    middleware: Middleware<unknown, unknown>[];
}

export interface ConsumerEvents {
    close: never;
    error: Error;
    'message-error': Error;
}

export interface Consumer {
    emitter: TypedEventEmitter<ConsumerEvents>;
    isClosing: boolean;
    isClosed: boolean;
    close: () => Promise<void>;
    prefetch: (prefetch: number) => Replies.Empty;
}

export const makeConsumer = async <TMessage = unknown, TReply = unknown>(
    cb: MessageCallback<TMessage, TReply>,
    connectionManager: ConnectionManager,
    opts: ConsumerOpts,
    log: Loggers
): Promise<Consumer> => {
    let channel: Channel;
    let messageManager = makeMessageManager();
    let consumerTag: string;
    const emitter = makeEmitter<ConsumerEvents>();
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
            log.info('Consumer', 'channel closed');
            channel = null;
            if (opts.reestablish) {
                await delay(5);
                try {
                    if (!consumer.isClosing) {
                        messageManager = makeMessageManager();
                        await start();
                    }
                } catch (e) {
                    log.error('Consumer', 'Failed to restart consumer', e);
                    emitter.emit('error', e);
                }
            }
            if (!consumer.isClosing) {
                await close();
            }
        });
        await setPrefetch(opts.prefetch || 0);
        ({ consumerTag } = await channel.consume(opts.queue.getName(), async (message) => {
            if (message === null) {
                return;
            }
            let messageInstance: HaredoMessage<TMessage, TReply>;
            const methods: Methods<TReply> = {
                ack: () => {
                    if (!channel) {
                        throw new ChannelBrokenError();
                    }
                    channel.ack(message);
                },
                nack: (requeue = true) => {
                    if (!channel) {
                        throw new ChannelBrokenError();
                    }
                    channel.nack(message, false, requeue);
                },
                reply: async (reply) => {
                    await initialChain({ connectionManager })
                        .queue(message.properties.replyTo)
                        .skipSetup()
                        .publish(opts.json ? JSON.stringify(reply) : reply, {
                            correlationId: message.properties.correlationId
                        });
                }
            };
            try {
                if (consumer.isClosing) {
                    return;
                }
                messageInstance = makeHaredoMessage<TMessage, TReply>(message, opts.json, methods);
                messageManager.add(messageInstance);
                await applyMiddleware(opts.middleware || [], cb, messageInstance, opts.autoAck, opts.autoReply, log);
                if (opts.autoAck && !messageInstance.isHandled()) {
                    messageInstance.ack();
                }
            } catch (e) {
                if (!messageInstance) {
                    log.error('Consumer', 'failed initializing a message instance', e);
                    methods.nack(false);
                } else {
                    log.error('Consumer', 'error while handling message', e, messageInstance);
                    messageInstance.nack(true);
                }
            }
        }));
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
                log.warning('Consumer', 'message was handled in the middleware but middleware called next() anyway');
                return;
            }
            return applyMiddleware(tail(middleware), cb, msg, autoAck, autoReply, log);
        });
        if (!nextWasCalled && !msg.isHandled()) {
            await applyMiddleware(tail(middleware), cb, msg, autoAck, autoReply, log);
        }
    }
};
