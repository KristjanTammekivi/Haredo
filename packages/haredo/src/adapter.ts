import { AMQPChannel, AMQPClient, AMQPQueue } from '@cloudamqp/amqp-client';
import { NotConnectedError } from './errors';
import { makeHaredoMessage } from './haredo-message';
import { Adapter, AdapterEvents, AdapterOptions, Consumer } from './types';
import { delay } from './utils/delay';
import { Logger } from './utils/logger';
import { normalizeUrl } from './utils/normalize-url';
import { createTracker } from './utils/tracker';
import { TypedEventEmitter } from './utils/typed-event-emitter';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'closing' | 'closed';

export const createAdapter = (
    Client: typeof AMQPClient,
    Queue: typeof AMQPQueue,
    { url, tlsOptions, reconnectDelay = 500 }: AdapterOptions,
    logger: Logger
): Adapter => {
    let status: ConnectionStatus = 'disconnected';
    let client: AMQPClient | undefined;
    let clientPromise: Promise<any> | undefined;
    let consumers: { channel: AMQPChannel; consumer: Consumer }[] = [];
    let publishChannel: AMQPChannel | undefined;
    let confirmChannel: AMQPChannel | undefined;
    const connectionLogger = logger.component('connection');
    const setConnectionStatus = (newStatus: ConnectionStatus) => {
        status = newStatus;
        connectionLogger.info(`Setting status to ${ status }`);
    };
    const emitter = new TypedEventEmitter<AdapterEvents>();
    const loopGetConnection = async () => {
        let attempt = 0;
        while (true) {
            try {
                const c = new Client(normalizeUrl(url), tlsOptions);
                const AMQPClientLogger = logger.component('AMQPClient');
                c.logger = {
                    debug: AMQPClientLogger.debug,
                    info: AMQPClientLogger.info,
                    warn: AMQPClientLogger.warning,
                    error: AMQPClientLogger.error
                };
                emitter.emit('connecting', { attempt: attempt + 1 });
                logger.info('Connecting');
                await c.connect();
                return c;
            } catch (error) {
                emitter.emit('connectingFailed', { attempt: attempt + 1, error });
                logger.setError(error as Error).error('Error connecting to RabbitMQ, retrying in 5 seconds');
                await delay(typeof reconnectDelay === 'number' ? reconnectDelay : reconnectDelay(++attempt));
            }
        }
    };
    const waitForClient = async () => {
        if (['disconnected', 'closed'].includes(status)) {
            throw new NotConnectedError();
        }
        if (!client) {
            await clientPromise;
        }
    };
    const useChannel = async <T>(callback: (channel: AMQPChannel) => Promise<T>): Promise<T> => {
        await waitForClient();
        const channel = await client!.channel();
        let isChannelOpen = true;
        channel.onerror = (reason) => {
            logger.warning('Channel closed by server:', reason);
            isChannelOpen = false;
        };
        try {
            return await callback(channel);
        } finally {
            if (isChannelOpen) {
                await channel.close();
            }
        }
    };
    const connect = async () => {
        if (client) {
            return;
        }
        if (clientPromise) {
            return clientPromise;
        }
        setConnectionStatus('connecting');
        const connectionPromise = loopGetConnection();
        clientPromise = connectionPromise.then(() => delay(5));
        client = await connectionPromise;
        emitter.emit('connected', null);
        setConnectionStatus('connected');
        clientPromise = undefined;
        client.onerror = (error) => {
            client = undefined;
            logger.setError(error).warning('Disconnected');
            void connect();
        };
    };
    return {
        emitter,
        connect,
        close: async (force = false) => {
            if (!client) {
                return;
            }
            setConnectionStatus('closing');
            logger.info('Closing');
            if (!force) {
                logger.info(`Waiting for ${ consumers.length } consumers to close`);
                await Promise.all(
                    consumers.map(async (x) => {
                        await x.consumer.cancel();
                    })
                );
                logger.info('All consumers closed');
                if (publishChannel) {
                    await publishChannel.close();
                }
                if (confirmChannel) {
                    await confirmChannel.close();
                }
            }
            logger.info('Closing client');
            await client.close();
            emitter.emit('disconnected', null);
            logger.info('Closed');
            client = undefined;
            setConnectionStatus('closed');
        },
        createQueue: async (name, options, args) => {
            return useChannel(async (channel) => {
                const queue = await channel.queue(name, options, args);
                return queue.name;
            });
        },
        deleteQueue: async (name, { ifUnused = false, ifEmpty = false } = {}) => {
            await useChannel(async (channel) => {
                await channel.queueDelete(name, { ifUnused, ifEmpty });
            });
        },
        createExchange: async (name, type, options, args) => {
            await useChannel(async (channel) => {
                await channel.exchangeDeclare(name, type, options, args);
            });
        },
        deleteExchange: async (name, { ifUnused = false } = {}) => {
            await useChannel(async (channel) => {
                await channel.exchangeDelete(name, { ifUnused });
            });
        },
        bindQueue: async (queueName, exchangeName, routingKey, args) => {
            await useChannel(async (channel) => {
                await channel.queueBind(queueName, exchangeName, routingKey || '#', args);
            });
        },
        unbindQueue: async (queueName, exchangeName, routingKey, args) => {
            await useChannel(async (channel) => {
                await channel.queueUnbind(queueName, exchangeName, routingKey || '#', args);
            });
        },
        bindExchange: async (destination, source, routingKey, args) => {
            await useChannel(async (channel) => {
                await channel.exchangeBind(destination, source, routingKey || '#', args);
            });
        },
        unbindExchange: async (destination, source, routingKey, args) => {
            await useChannel(async (channel) => {
                await channel.exchangeUnbind(destination, source, routingKey || '#', args);
            });
        },
        purgeQueue: async (name) => {
            await useChannel(async (channel) => {
                await channel.queuePurge(name);
            });
        },
        sendToQueue: async (name, message, { confirm, ...options }) => {
            await waitForClient();
            let channel: AMQPChannel;
            if (confirm) {
                if (!confirmChannel) {
                    confirmChannel = await client!.channel();
                    confirmChannel.onerror = (reason) => {
                        logger.error('Confirm channel closed by server:', reason);
                        confirmChannel = undefined;
                    };
                    await confirmChannel.confirmSelect();
                }
                channel = confirmChannel;
            } else {
                if (!publishChannel) {
                    publishChannel = await client!.channel();
                    publishChannel.onerror = (reason) => {
                        logger.error('Publish channel closed by server:', reason);
                        publishChannel = undefined;
                    };
                }
                channel = publishChannel;
            }
            const q = new Queue(channel, name);
            await q.publish(message, options);
        },
        publish: async (exchange, routingKey, message, { confirm, immediate, mandatory, ...options }) => {
            await waitForClient();
            let channel: AMQPChannel;
            if (confirm) {
                if (!confirmChannel) {
                    confirmChannel = await client!.channel();
                    confirmChannel.onerror = (reason) => {
                        logger.error('Confirm channel closed by server:', reason);
                        confirmChannel = undefined;
                    };
                    await confirmChannel.confirmSelect();
                }
                channel = confirmChannel;
            } else {
                if (!publishChannel) {
                    publishChannel = await client!.channel();
                    publishChannel.onerror = (reason) => {
                        logger.error('Publish channel closed by server:', reason);
                        publishChannel = undefined;
                    };
                }
                channel = publishChannel;
            }
            await channel.basicPublish(exchange, routingKey, message, options, mandatory, immediate);
        },
        subscribe: async (
            name,
            { onClose, prefetch, args, parseJson = true, noAck = false, exclusive = false },
            callback
        ) => {
            await waitForClient();
            const channel = await client!.channel();
            try {
                if (prefetch) {
                    await channel.prefetch(prefetch);
                }
                const tracker = createTracker();
                const consumer = await channel.basicConsume(name, { noAck, exclusive, args }, async (message) => {
                    tracker.inc();
                    const wrappedMessage = makeHaredoMessage<unknown>(message, parseJson, name);
                    // TODO: handle possible error when acking a message where channel is closed
                    await callback(wrappedMessage);
                    tracker.dec();
                });
                let cancelPromise: Promise<void> | undefined;
                const wrappedConsumer = {
                    cancel: async () => {
                        if (cancelPromise) {
                            return cancelPromise;
                        }
                        cancelPromise = consumer.cancel().then(async () => {
                            await tracker.wait();
                        });
                        await cancelPromise;
                        consumers = consumers.filter((x) => x.consumer !== wrappedConsumer);
                        await channel.close();
                    }
                };
                consumers = [...consumers, { channel, consumer: wrappedConsumer }];
                consumer
                    .wait()
                    .then(() => {
                        onClose(null);
                    })
                    .catch((error) => {
                        onClose(error);
                    });
                return wrappedConsumer;
            } catch (error) {
                logger.setError(error as Error).error('Error subscribing to queue');
                await channel.close();
                throw error;
            }
        }
    };
};
