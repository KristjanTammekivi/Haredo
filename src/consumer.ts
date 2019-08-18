import { makeLogger } from './loggers';
import { HaredoMessage, makeHaredoMessage } from './haredo-message';
import { Queue } from './queue';
import { Middleware } from './state';
import { Channel, Replies } from 'amqplib';
import { ConnectionManager } from './connection-manager';
import { delay } from 'bluebird';
import { MessageManager } from './message-manager';
import { makeEmitter, TypedEventEmitter } from './events';
import { ChannelBrokenError } from './errors';
import { initialChain } from './haredo';
import { head, tail } from './utils';

const { debug, error, info } = makeLogger('Consumer');

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
    opts: ConsumerOpts
): Promise<Consumer> => {
    let channel: Channel;
    let messageManager = new MessageManager();
    let consumerTag: string;
    const emitter = makeEmitter<ConsumerEvents>();
    const close = async () => {
        consumer.isClosing = true;
        if (consumerTag && channel) {
            await channel.cancel(consumerTag);
        }
        consumer.isClosed = true;
    };
    const setPrefetch = (prefetch: number) => {
        return channel.prefetch(prefetch, true);
    };
    const start = async () => {
        await opts.setup();
        channel = await connectionManager.getChannel();
        channel.once('close', async () => {
            info('channel closed');
            channel = null;
            if (opts.reestablish) {
                await delay(5);
                try {
                    if (!consumer.isClosing) {
                        messageManager = new MessageManager();
                        await start();
                    }
                } catch (e) {
                    error('Failed to restart consumer', e);
                    emitter.emit('error', e);
                }
            }
            await close();
        });
        await setPrefetch(opts.prefetch || 0);
        ({ consumerTag } = await channel.consume(opts.queue.name, async (message) => {
            if (message === null) {
                return;
            }
            try {
                if (consumer.isClosing) {
                    return;
                }
                const messageInstance = makeHaredoMessage<TMessage, TReply>(message, opts.json, {
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
                            .publish(reply, {
                                correlationId: message.properties.correlationId
                            });
                    }
                });
                await applyMiddleware(opts.middleware || [], cb, messageInstance);
            } catch (e) {
                console.error(e);
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

export const applyMiddleware = async <TMessage, TReply>(middleware: Middleware<TMessage, TReply>[], cb: MessageCallback<TMessage, TReply>, msg: HaredoMessage<TMessage, TReply>) => {
    if (!middleware.length) {
        const response = await cb(msg);
        if (typeof response !== 'undefined') {
            await msg.reply(response);
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
