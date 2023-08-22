import {
    AMQPChannel,
    AMQPClient,
    AMQPConsumer,
    AMQPMessage,
    AMQPProperties,
    AMQPQueue,
    ExchangeParams,
    QueueParams
} from '@cloudamqp/amqp-client';
import { HaredoMessage, makeHaredoMessage } from './haredo-message';

interface SubscribeOptions {
    onClose: (reason: Error | null) => void;
    prefetch?: number;
    noAck?: boolean;
    exclusive?: boolean;
}
export interface Consumer {
    cancel(): Promise<void>;
}

interface PublishOptions extends AMQPProperties {
    mandatory?: boolean;
    immediate?: boolean;
    confirm?: boolean;
}

export interface Adapter {
    connect(): Promise<AMQPClient>;
    close(): Promise<void>;
    createQueue(name: string | undefined, options?: QueueParams): Promise<string>;
    createExchange(name: string, type: string, options?: ExchangeParams): Promise<void>;
    bindQueue(queueName: string, exchangeName: string, routingKey?: string): Promise<void>;
    sendToQueue(name: string, message: string, options: PublishOptions): Promise<void>;
    publish(exchange: string, routingKey: string, message: string, options: PublishOptions): Promise<void>;
    subscribe(
        name: string,
        options: SubscribeOptions,
        callback: (message: HaredoMessage<unknown>) => void | Promise<void>
    ): Promise<Consumer>;
}

export const createAdapter = (Client: typeof AMQPClient, Queue: typeof AMQPQueue, url: string): Adapter => {
    let client: AMQPClient | undefined;
    let clientPromise: Promise<any> | undefined;
    let consumers: AMQPConsumer[] = [];
    let publishChannel: AMQPChannel;
    let confirmChannel: AMQPChannel;
    const loopGetConnection = async () => {
        while (true) {
            try {
                const c = new Client(url);
                await c.connect();
                return c;
            } catch {}
        }
    };
    const connect = async () => {
        // TODO: loopgetconnection
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
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            connect();
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
                    await x.cancel();
                    await x.channel.close();
                })
            );
            if (publishChannel) {
                await publishChannel.close();
            }
            await client.close();
        },
        createQueue: async (name, options) => {
            if (!client) {
                throw new Error('no client');
            }
            const channel = await client.channel();
            const queue = await channel.queue(name, options);
            return queue.name;
        },
        createExchange: async (name, type, options) => {
            if (!client) {
                throw new Error('no client');
            }
            const channel = await client.channel();
            await channel.exchangeDeclare(name, type, options);
        },
        bindQueue: async (queueName, exchangeName, routingKey) => {
            if (!client) {
                throw new Error('no client');
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
        subscribe: async (name, { onClose, prefetch, noAck = false, exclusive = false }, callback) => {
            if (!client) {
                throw new Error('no client');
            }
            const channel = await client.channel();
            if (prefetch) {
                await channel.prefetch(prefetch);
            }
            const consumer = await channel.basicConsume(name, { noAck, exclusive }, async (message) => {
                const wrappedMessage = makeHaredoMessage<unknown>(message, true, name);
                await callback(wrappedMessage);
            });
            consumers = [...consumers, consumer];
            consumer
                .wait()
                .then(() => {
                    onClose(null);
                })
                .catch((error) => {
                    onClose(error);
                });
            return {
                cancel: async () => {
                    await consumer.cancel();
                }
            };
        }
    };
};