import {
    AMQPChannel,
    AMQPClient,
    AMQPProperties,
    AMQPQueue,
    ExchangeParams,
    QueueParams
} from '@cloudamqp/amqp-client';
import { ExchangeArguments } from './exchange';
import { HaredoMessage, makeHaredoMessage } from './haredo-message';
import { QueueArguments } from './queue';
import { RabbitUrl, StreamOffset } from './types';
import { normalizeUrl } from './utils/normalize-url';
import { createTracker } from './utils/tracker';

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

export interface Adapter {
    connect(): Promise<AMQPClient>;
    close(): Promise<void>;
    createQueue(name: string | undefined, options?: QueueParams, args?: QueueArguments): Promise<string>;
    createExchange(name: string, type: string, options?: ExchangeParams, args?: ExchangeArguments): Promise<void>;
    bindQueue(queueName: string, exchangeName: string, routingKey?: string): Promise<void>;
    sendToQueue(name: string, message: string, options: PublishOptions): Promise<void>;
    publish(exchange: string, routingKey: string, message: string, options: PublishOptions): Promise<void>;
    subscribe(
        name: string,
        options: SubscribeOptions,
        callback: (message: HaredoMessage<unknown>) => void | Promise<void>
    ): Promise<Consumer>;
}

export const createAdapter = (Client: typeof AMQPClient, Queue: typeof AMQPQueue, url: string | RabbitUrl): Adapter => {
    let client: AMQPClient | undefined;
    let clientPromise: Promise<any> | undefined;
    let consumers: { channel: AMQPChannel; consumer: Consumer }[] = [];
    let publishChannel: AMQPChannel;
    let confirmChannel: AMQPChannel;
    const loopGetConnection = async () => {
        while (true) {
            try {
                const c = new Client(normalizeUrl(url));
                await c.connect();
                return c;
            } catch {}
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
        clientPromise = loopGetConnection();
        client = await clientPromise;
        clientPromise = undefined;
        client!.onerror = () => {
            client = undefined;
            void connect();
        };
        return client!;
    };
    return {
        connect,
        close: async () => {
            if (!client) {
                return;
            }
            await Promise.all(
                consumers.map(async (x) => {
                    await x.consumer.cancel();
                    await x.channel.close();
                })
            );
            if (publishChannel) {
                await publishChannel.close();
            }
            await client.close();
            client = undefined;
        },
        createQueue: async (name, options, args) => {
            if (!client) {
                throw new Error('No client');
            }
            const channel = await client.channel();
            try {
                const queue = await channel.queue(name, options, args);
                return queue.name;
            } finally {
                await channel.close();
            }
        },
        createExchange: async (name, type, options, args) => {
            if (!client) {
                throw new Error('No client');
            }
            const channel = await client.channel();
            try {
                await channel.exchangeDeclare(name, type, options, args);
            } finally {
                await channel.close();
            }
        },
        bindQueue: async (queueName, exchangeName, routingKey) => {
            if (!client) {
                throw new Error('No client');
            }
            const channel = await client.channel();
            await channel.queueBind(queueName, exchangeName, routingKey || '#');
        },
        sendToQueue: async (name, message, { confirm, ...options }) => {
            if (!client) {
                throw new Error('No client');
            }
            let channel: AMQPChannel;
            if (confirm) {
                if (!confirmChannel) {
                    confirmChannel = await client.channel();
                    await confirmChannel.confirmSelect();
                }
                channel = confirmChannel;
            } else {
                if (!publishChannel) {
                    console.log('creating new channel for publishing');

                    publishChannel = await client.channel();
                }
                channel = publishChannel;
            }
            const q = new Queue(channel, name);
            await q.publish(message, options);
        },
        publish: async (exchange, routingKey, message, { confirm, immediate, mandatory, ...options }) => {
            if (!client) {
                throw new Error('No client');
            }
            let channel: AMQPChannel;
            if (confirm) {
                if (!confirmChannel) {
                    confirmChannel = await client.channel();
                    await confirmChannel.confirmSelect();
                }
                channel = confirmChannel;
            } else {
                if (!publishChannel) {
                    publishChannel = await client.channel();
                }
                channel = publishChannel;
            }
            await channel.basicPublish(exchange, routingKey, message, options, mandatory, immediate);
        },
        subscribe: async (name, { onClose, prefetch, args, noAck = false, exclusive = false }, callback) => {
            if (!client) {
                throw new Error('No client');
            }
            const channel = await client.channel();
            if (prefetch) {
                await channel.prefetch(prefetch);
            }
            const tracker = createTracker();
            console.log(args);
            const consumer = await channel.basicConsume(name, { noAck, exclusive, args }, async (message) => {
                tracker.inc();
                const wrappedMessage = makeHaredoMessage<unknown>(message, true, name);
                await callback(wrappedMessage);
                tracker.dec();
            });
            let cancelPromise: Promise<void> | undefined;
            const wrappedConsumer = {
                channel,
                cancel: async () => {
                    if (cancelPromise) {
                        return cancelPromise;
                    }
                    cancelPromise = consumer.cancel().then(async () => {
                        await tracker.wait();
                    });
                    await cancelPromise;
                    consumers = consumers.filter((x) => x.consumer !== wrappedConsumer);
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
        }
    };
};
