import { QueueParams } from '@cloudamqp/amqp-client';
import { ExchangeInterface } from './exchange';
import { set } from './utils/set';

type XOverflow = 'drop-head' | 'reject-publish' | 'reject-publish-dlx';

interface KnownQueueArguments {
    /**
     * Maximum TTL for messages in the queue.
     */
    'message-ttl'?: number;
    /**
     * In case of messages being rejected or dead, they will be sent to the
     * specified exchange.
     */
    'x-dead-letter-exchange'?: string;
    /**
     * When paired with x-dead-letter-exchange this will be the routing key
     * for dead letter messages.
     */
    'x-dead-letter-routing-key'?: string;
    /**
     * The type of the queue.
     */
    'x-queue-type'?: 'classic' | 'quorum' | 'stream';
    /**
     * Maximum length of the queue. Overflow behavior is set with x-overflow.
     */
    'x-max-length'?: number;
    /**
     * Maximum length of the queue in bytes. Overflow behavior is set with x-overflow.
     */
    'x-max-length-bytes'?: number;
    /**
     * Overflow behavior for x-max-length and x-max-length-bytes.
     * @default 'drop-head'
     */
    'x-overflow'?: XOverflow;
    /**
     * Delete the queue after the given time in milliseconds of disuse.
     */
    'x-expires'?: number;
    /**
     * Maximum priority of the messages in the queue.
     * Larger numbers indicate higher priority.
     */
    'x-max-priority'?: number;
    /**
     * Maximum number of times a message in the queue will be delivered.
     * Only applicable to quorum queues.
     */
    'x-delivery-limit'?: number;
    /**
     * Set the queue to have a single active consumer.
     * See https://www.rabbitmq.com/consumers.html#single-active-consumer
     */
    'x-single-active-consumer'?: boolean;
}

export type QueueArguments = Omit<Record<string, string | number | boolean>, keyof KnownQueueArguments> &
    KnownQueueArguments;

export const Queue = <T = unknown>(
    name?: string,
    params: QueueParams = {},
    args = {} as QueueArguments
): QueueInterface<T> => {
    const setArgument: QueueInterface['setArgument'] = (key, value) => Queue(name, params, set(args, key, value));
    return {
        name,
        params,
        args,
        setArgument,
        quorum: () => setArgument('x-queue-type', 'quorum'),
        stream: () => setArgument('x-queue-type', 'stream'),
        autoDelete: (autoDelete = true) => Queue(name, set(params, 'autoDelete', autoDelete), args),
        exclusive: (exclusive = true) => Queue(name, set(params, 'exclusive', exclusive), args),
        durable: (durable = true) => Queue(name, set(params, 'durable', durable), args),
        passive: (passive = true) => Queue(name, set(params, 'passive', passive), args),
        messageTtl: (ttl) => setArgument('message-ttl', ttl),
        maxLength: (maxLength, overflow) => setArgument('x-max-length', maxLength).setArgument('x-overflow', overflow),
        maxLengthBytes: (maxLengthBytes, overflow) =>
            setArgument('x-max-length-bytes', maxLengthBytes).setArgument('x-overflow', overflow),
        dead: (dlx, rk) =>
            setArgument('x-dead-letter-exchange', typeof dlx === 'string' ? dlx : dlx.name).setArgument(
                'x-dead-letter-routing-key',
                rk
            ),
        expires: (ms) => setArgument('x-expires', ms),
        maxPriority: (priority) => setArgument('x-max-priority', priority),
        deliveryLimit: (limit) => setArgument('x-delivery-limit', limit),
        singleActiveConsumer: () => setArgument('x-single-active-consumer', true)
    };
};

export interface QueueInterface<TMESSAGE = unknown> {
    name: string | undefined;
    params: QueueParams;
    args: QueueArguments;
    setArgument(
        key: keyof QueueArguments,
        value: QueueArguments[keyof QueueArguments] | undefined
    ): QueueInterface<TMESSAGE>;
    /**
     * Set the queue type to quorum.
     */
    quorum(): QueueInterface<TMESSAGE>;
    /**
     * Set the queue type to stream.
     */
    stream(): QueueInterface<TMESSAGE>;
    /**
     * Set the queue to auto delete when the last consumer disconnects.
     */
    autoDelete(autoDelete?: boolean): QueueInterface<TMESSAGE>;
    /**
     * Set the queue to be exclusive.
     * Exclusive queues can only be used by one connection
     * and will be deleted when the connection closes.
     */
    exclusive(exclusive?: boolean): QueueInterface<TMESSAGE>;
    /**
     * Set the queue to be durable.
     * Durable queues will survive a broker restart.
     */
    durable(durable?: boolean): QueueInterface<TMESSAGE>;
    /**
     * Set the queue to be passive.
     * Passive queues will not be created by the broker.
     */
    passive(passive?: boolean): QueueInterface<TMESSAGE>;
    /**
     * Set the dead letter exchange.
     */
    dead(deadLetterExchange: string | ExchangeInterface, rountingKey?: string): QueueInterface<TMESSAGE>;
    /**
     * Set message TTL. Messages in the queue will be expired after the TTL.
     * If dead letter exchange is set, expired messages will be sent to the
     * dead letter exchange.
     */
    messageTtl(ttl: number): QueueInterface<TMESSAGE>;
    /**
     * Set the max length of the queue.
     */
    maxLength(maxLength: number, overflowBehavior?: XOverflow): QueueInterface<TMESSAGE>;
    /**
     * Set the max length of the queue in bytes.
     */
    maxLengthBytes(maxLengthBytes: number, overflowBehavior?: XOverflow): QueueInterface<TMESSAGE>;
    /**
     * Delete the queue after the given time in milliseconds of disuse.
     */
    expires(ms: number): QueueInterface<TMESSAGE>;
    /**
     * Set maximum priority of the messages in the queue.
     * Larger numbers indicate higher priority.
     */
    maxPriority(priority: number): QueueInterface<TMESSAGE>;
    /**
     * Set the delivery limit of the queue.
     * Only applicable to quorum queues.
     */
    deliveryLimit(limit: number): QueueInterface<TMESSAGE>;
    /**
     * Set the queue to have a single active consumer.
     * See https://www.rabbitmq.com/consumers.html#single-active-consumer
     */
    singleActiveConsumer(): QueueInterface<TMESSAGE>;
}
