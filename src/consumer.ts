import { makeLogger } from './loggers';
import { HaredoMessage } from './haredo-message';
import { Queue } from './queue';
import { Middleware } from './state';
import { Channel, Replies } from 'amqplib';
import { ConnectionManager } from './connection-manager';
import { delay } from 'bluebird';
import { MessageManager } from './message-manager';
import { makeEmitter } from './events';

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
    middleware: Middleware<unknown>[]
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

export const makeConsumer = async (connectionManager: ConnectionManager, opts: ConsumerOpts): Promise<Consumer> => {
    let channel: Channel;
    let cancelling = false;
    let messageManager = new MessageManager();
    const emitter = makeEmitter<ConsumerEvents>;
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
        const consumerInfo = await channel.consume(opts.queue.name, async (message) => {
            if (message === null) {
                return;
            }
            try {
                if (this.cancelling) {
                    return;
                }
                const messageInstance = new HaredoMessage<T>(message, opts.json);
            }
        });
    };
    await start();
    return {
        cancel,
        prefetch: setPrefetch
    };
};
