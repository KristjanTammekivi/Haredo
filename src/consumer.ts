import { makeLogger } from './loggers';
import { HaredoMessage, makeHaredoMessage } from './haredo-message';
import { Queue } from './queue';
import { Middleware } from './state';
import { Channel, Replies } from 'amqplib';
import { ConnectionManager } from './connection-manager';
import { delay } from 'bluebird';
import { MessageManager } from './message-manager';
import { makeEmitter } from './events';
import { ChannelBrokenError } from './errors';
import { initialChain } from './haredo';

const { debug, error, info } = makeLogger('Consumer');

export interface MessageCallback<TMessage = unknown, TReply = unknown> {
    (data: TMessage, messageWrapper?: HaredoMessage<TMessage>): Promise<TReply | void> | TReply | void;
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
    cancel: never;
    error: Error;
    'message-error': Error;
}

export interface Consumer {
    cancel: () => Promise<void>;
    prefetch: (prefetch: number) => Replies.Empty;
}

export const makeConsumer = async <TMessage = unknown, TReply = unknown>(
    cb: MessageCallback<TMessage, TReply>,
    connectionManager: ConnectionManager,
    opts: ConsumerOpts
): Promise<Consumer> => {
    let channel: Channel;
    let cancelling = false;
    let messageManager = new MessageManager();
    let consumerTag: string;
    const emitter = makeEmitter<ConsumerEvents>();
    const cancel = async () => {
        cancelling = true;
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
                    if (!cancelling) {
                        messageManager = new MessageManager();
                        await start();
                    }
                } catch (e) {
                    error('Failed to restart consumer', e);
                    emitter.emit('error', e);
                }
                return;
            }
            await cancel();
        });
        if (opts.prefetch) {
            await setPrefetch(opts.prefetch);
        }
        ({ consumerTag } = await channel.consume(opts.queue.name, async (message) => {
            if (message === null) {
                return;
            }
            try {
                if (cancelling) {
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
                            .publish(reply, {
                                correlationId: message.properties.correlationId
                            });
                    }
                });
            } catch {

            }
        }));
    };
    await start();
    return {
        cancel,
        prefetch: setPrefetch
    };
};
