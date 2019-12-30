import { ConnectionManager } from './connection-manager';
import { Channel, ConfirmChannel } from 'amqplib';
import { ExtendedPublishOptions } from './prepared-message';
import { Loggers } from './state';
import { makeTicketMachine } from './utils';

export interface Publisher {
    publishToExchange: (exchange: string, routingKey: string, data: Buffer, opts: ExtendedPublishOptions, confirm: boolean) => Promise<void>;
    sendToQueue: (queue: string, data: Buffer, opts: ExtendedPublishOptions, confirm: boolean) => Promise<void>;
}

export const makePublisher = (cm: ConnectionManager, log: Loggers): Publisher => {
    let channelPromise: Promise<Channel>;
    let confirmChannelPromise: Promise<ConfirmChannel>;
    let wrappedChannel: ReturnType<typeof wrapChannel>;
    let wrappedConfirmChannel: ReturnType<typeof wrapChannel>;
    const getChannel = async () => {
        if (wrappedChannel) {
            return wrappedChannel;
        }
        if (channelPromise) {
            await channelPromise;
            return wrappedChannel;
        }
        channelPromise = cm.getChannel();
        log.info('Publisher', 'opening channel');
        const channel = await channelPromise;
        log.info('Publisher', 'channel opened');
        wrappedChannel = wrapChannel(channel, false, log);
        channelPromise = undefined;
        channel.on('close', () => {
            log.info('Publisher', 'channel closed');
            wrappedChannel.stop();
            wrappedChannel = undefined;
        });
        return wrappedChannel;
    };
    const getConfirmChannel = async () => {
        if (wrappedConfirmChannel) {
            return wrappedConfirmChannel;
        }
        if (confirmChannelPromise) {
            await confirmChannelPromise;
            return wrappedConfirmChannel;
        }
        confirmChannelPromise = cm.getConfirmChannel();
        log.info('Publisher', 'opening confirm-channel');
        const confirmChannel = await confirmChannelPromise;
        log.info('Publisher', 'confirm-channel opened');
        wrappedConfirmChannel = wrapChannel(confirmChannel, true, log);
        confirmChannelPromise = undefined;
        confirmChannel.on('close', () => {
            log.info('Publisher', 'confirm-channel closed');
            wrappedConfirmChannel.stop();
            wrappedConfirmChannel = undefined;
        });
        return wrappedConfirmChannel;
    };
    return {
        publishToExchange: async (exchange: string, routingKey: string, data: Buffer, opts: ExtendedPublishOptions, confirm: boolean) => {
            let channel: typeof wrappedChannel;
            if (confirm) {
                channel = await getConfirmChannel();
            } else {
                channel = await getChannel();
            }
            return channel.publishToExchange(exchange, routingKey, data, opts);
        },
        sendToQueue: async (queue: string, data: Buffer, opts: ExtendedPublishOptions, confirm: boolean) => {
            let channel: typeof wrappedChannel;
            if (confirm) {
                channel = await getConfirmChannel();
            } else {
                channel = await getChannel();
            }
            return channel.sendToQueue(queue, data, opts);
        }
    };
};

const wrapChannel = <T extends Channel | ConfirmChannel>(channel: T, confirm: boolean, log: Loggers) => {
    const ticketMachine = makeTicketMachine();
    channel.on('drain', () => {
        log.debug('Publisher', `${ confirm ? 'confirm-channel' : 'channel' } drained, resuming publishing`);
        ticketMachine.play();
    });
    return {
        publishToExchange: async (exchange: string, routingKey: string, data: Buffer, opts: ExtendedPublishOptions) => {
            const release = await ticketMachine.take();
            if (isConfirmChannel(channel, confirm)) {
                return new Promise<void>((resolve, reject) => {
                    channel.publish(exchange, routingKey, data, opts, (err) => {
                        release();
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                });
            }
            const ready = channel.publish(exchange, routingKey, data, opts);
            if (!ready) {
                log.debug('Publisher', `${confirm ? 'confirm-channel' : 'channel'} returned false on publishing, pausing publishing until drain`);
                ticketMachine.pause();
            }
            release();
        },
        sendToQueue: async (queue: string, data: Buffer, opts: ExtendedPublishOptions) => {
            const release = await ticketMachine.take();
            if (isConfirmChannel(channel, confirm)) {
                return new Promise<void>((resolve, reject) => {
                    channel.sendToQueue(queue, data, opts, (err) => {
                        release();
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                });
            }
            const ready = channel.sendToQueue(queue, data, opts);
            if (!ready) {
                log.debug('Publisher', `${confirm ? 'confirm-channel' : 'channel'} returned false on publishing, pausing publishing until drain`);
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
