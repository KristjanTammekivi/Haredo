import { ConnectionManager } from './connection-manager';
import { Channel, ConfirmChannel } from 'amqplib';
import { ExtendedPublishOptions } from './prepared-message';
import { Loggers } from './state';
import { makeTicketMachine } from './utils';

type PromiseOf<T> = T extends Promise<infer U> ? U : never;

export interface Publisher {
    publishToExchange(exchange: string, routingKey: string, data: Buffer, opts: ExtendedPublishOptions, confirm: boolean): Promise<void>;
    sendToQueue(queue: string, data: Buffer, opts: ExtendedPublishOptions, confirm: boolean): Promise<void>;
}

export const makePublisher = (cm: ConnectionManager, log: Loggers): Publisher => {
    const getChannel = wrappedChannelGetter(() => cm.getChannel(), log, false);
    const getConfirmChannel = wrappedChannelGetter(() => cm.getConfirmChannel(), log, true);
    return {
        publishToExchange: async (exchange: string, routingKey: string, data: Buffer, opts: ExtendedPublishOptions, confirm: boolean) => {
            let channel: PromiseOf<ReturnType<typeof getChannel>>;
            if (confirm) {
                channel = await getConfirmChannel();
            } else {
                channel = await getChannel();
            }
            return channel.publishToExchange(exchange, routingKey, data, opts);
        },
        sendToQueue: async (queue: string, data: Buffer, opts: ExtendedPublishOptions, confirm: boolean) => {
            let channel: PromiseOf<ReturnType<typeof getChannel>>;
            if (confirm) {
                channel = await getConfirmChannel();
            } else {
                channel = await getChannel();
            }
            return channel.sendToQueue(queue, data, opts);
        }
    };
};

export const wrappedChannelGetter = <T extends Channel | ConfirmChannel>(
    channelGetter: () => Promise<T>,
    log: Loggers,
    isConfirmChannel: boolean
) => {
    let channelPromise: Promise<Channel>;
    let wrappedChannel: ReturnType<typeof wrapChannel>;
    return async () => {
        if (wrappedChannel) {
            return wrappedChannel;
        }
        if (channelPromise) {
            await channelPromise;
            return wrappedChannel;
        }
        channelPromise = channelGetter();
        log.info({ component: 'Publisher', msg: 'opening channel' });
        const channel = await channelPromise;
        log.info({ component: 'Publisher', msg: 'channel opened' });
        wrappedChannel = wrapChannel(channel, isConfirmChannel, log);
        channelPromise = undefined;
        channel.on('close', () => {
            log.info({ component: 'Publisher', msg: 'channel closed' });
            wrappedChannel.stop();
            wrappedChannel = undefined;
        });
        return wrappedChannel;
    };
};

export const wrapChannel = <T extends Channel | ConfirmChannel>(
    channel: T,
    confirm: boolean,
    log: Loggers,
    ticketMachine = makeTicketMachine()
) => {
    channel.on('drain', () => {
        log.debug({ component: 'Publisher', msg: `${ confirm ? 'confirm-channel' : 'channel' } drained, resuming publishing` });
        ticketMachine.play();
    });
    return {
        publishToExchange: async (exchange: string, routingKey: string, data: Buffer, opts: ExtendedPublishOptions) => {
            const release = await ticketMachine.take();
            if (isConfirmChannel(channel, confirm)) {
                return new Promise<void>((resolve, reject) => {
                    const ready = channel.publish(exchange, routingKey, data, opts, (err) => {
                        release();
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                    if (!ready) {
                        ticketMachine.pause();
                    }
                });
            }
            const ready = channel.publish(exchange, routingKey, data, opts);
            if (!ready) {
                /* istanbul ignore next */
                log.debug({ component: 'Publisher', msg: `${confirm ? 'confirm-channel' : 'channel'} returned false on publishing, pausing publishing until drain` });
                ticketMachine.pause();
            }
            release();
        },
        sendToQueue: async (queue: string, data: Buffer, opts: ExtendedPublishOptions) => {
            const release = await ticketMachine.take();
            if (isConfirmChannel(channel, confirm)) {
                return new Promise<void>((resolve, reject) => {
                    const ready = channel.sendToQueue(queue, data, opts, (err) => {
                        release();
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                    if (!ready) {
                        ticketMachine.pause();
                    }
                });
            }
            const ready = channel.sendToQueue(queue, data, opts);
            if (!ready) {
                /* istanbul ignore next */
                log.debug({ component: 'Publisher', msg: `${confirm ? 'confirm-channel' : 'channel'} returned false on publishing, pausing publishing until drain` });
                ticketMachine.pause();
            }
            release();
        },
        stop: () => {
            ticketMachine.stop();
        }
    };
};

const isConfirmChannel = (channel: any, isIt: boolean): channel is ConfirmChannel => isIt;
