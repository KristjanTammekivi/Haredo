import {
    AMQPChannel,
    AMQPClient,
    AMQPProperties,
    AMQPQueue,
    ExchangeParams,
    QueueParams,
    AMQPTlsOptions
} from '@cloudamqp/amqp-client';
import { ExchangeArguments } from './exchange';
import { makeHaredoMessage } from './haredo-message';
import { QueueArguments } from './queue';
import { HaredoMessage, RabbitUrl, StreamOffset } from './types';
import { normalizeUrl } from './utils/normalize-url';
import { createTracker } from './utils/tracker';
import { NotConnectedError } from './errors';
import { Logger } from './utils/logger';
import { delay } from './utils/delay';
import { TypedEventEmitter } from './utils/typed-event-emitter';

// arguments passed to consumer
export interface SubscribeArguments {
    /**
     * The priority of the consumer.
     * Higher priority consumers get messages in preference to
     * lower priority consumers.
     */
    'x-priority'?: number;
    /**
     * x-stream-offset is used to specify the offset from which
     * the consumer should start reading from the stream.
     * The value can be a positive integer or a negative integer.
     * A positive integer specifies the offset from the beginning
     * of the stream. A negative integer specifies the offset from
     * the end of the stream.
     * @see https://www.rabbitmq.com/streams.html#consuming
     */
    'x-stream-offset'?: StreamOffset;
}

interface SubscribeOptions {
    onClose: (reason: Error | null) => void;
    prefetch?: number;
    noAck?: boolean;
    exclusive?: boolean;
    args?: SubscribeArguments;
}
export interface Consumer {
    cancel(): Promise<void>;
}

export interface PublishOptions extends AMQPProperties {
    mandatory?: boolean;
    immediate?: boolean;
    confirm?: boolean;
}

interface KnownBindingArguments {
    'x-match'?: 'all' | 'any';
}

export type BindingArguments = Omit<Record<string, string | number>, keyof KnownBindingArguments> &
    KnownBindingArguments;

export interface QueueDeleteOptions {
    /**
     * Only delete if the queue doesn't have any consumers
     */
    ifUnused?: boolean;
    /**
     * Only delete if the queue is empty
     */
    ifEmpty?: boolean;
}

export interface ExchangeDeleteOptions {
    /**
     * Only delete if the exchange doesn't have any bindings
     */
    ifUnused?: boolean;
}

export interface AdapterEvents {
    connected: null;
    disconnected: null;
}

export interface Adapter {
    emitter: TypedEventEmitter<AdapterEvents>;
    connect(): Promise<AMQPClient>;
    close(force?: boolean): Promise<void>;
    createQueue(name: string | undefined, options?: QueueParams, args?: QueueArguments): Promise<string>;
    deleteQueue(name: string, options?: QueueDeleteOptions): Promise<void>;
    createExchange(name: string, type: string, options?: ExchangeParams, args?: ExchangeArguments): Promise<void>;
    deleteExchange(name: string, options?: ExchangeDeleteOptions): Promise<void>;
    bindQueue(queueName: string, exchangeName: string, routingKey?: string, args?: BindingArguments): Promise<void>;
    unbindQueue(queueName: string, exchangeName: string, routingKey?: string, args?: BindingArguments): Promise<void>;
    bindExchange(destination: string, source: string, routingKey?: string, args?: BindingArguments): Promise<void>;
    unbindExchange(destination: string, source: string, routingKey?: string, args?: BindingArguments): Promise<void>;
    sendToQueue(name: string, message: string, options: PublishOptions): Promise<void>;
    purgeQueue(name: string): Promise<void>;
    publish(exchange: string, routingKey: string, message: string, options: PublishOptions): Promise<void>;
    subscribe(
        name: string,
        options: SubscribeOptions,
        callback: (message: HaredoMessage<unknown>) => void | Promise<void>
    ): Promise<Consumer>;
}

export interface AdapterOptions {
    url: string | RabbitUrl;
    tlsOptions?: AMQPTlsOptions;
    /**
     * Add a delay between connection attempts.
     * @default 500
     */
    reconnectDelay?: number | ((attempt: number) => number);
}

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
                logger.info('Connecting');
                await c.connect();
                return c;
            } catch (error) {
                logger.setError(error).error('Error connecting to RabbitMQ, retrying in 5 seconds');
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
            return client;
        }
        if (clientPromise) {
            await clientPromise;
            return client!;
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
        return client;
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
        subscribe: async (name, { onClose, prefetch, args, noAck = false, exclusive = false }, callback) => {
            await waitForClient();
            const channel = await client!.channel();
            try {
                if (prefetch) {
                    await channel.prefetch(prefetch);
                }
                const tracker = createTracker();
                const consumer = await channel.basicConsume(name, { noAck, exclusive, args }, async (message) => {
                    tracker.inc();
                    const wrappedMessage = makeHaredoMessage<unknown>(message, true, name);
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
                logger.error('Error subscribing to queue:', error);
                await channel.close();
                throw error;
            }
        }
    };
};
