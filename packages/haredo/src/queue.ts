import { QueueParams } from '@cloudamqp/amqp-client';
import { set } from './utils/set';
import { QueueArguments, QueueInterface } from './types';

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
        singleActiveConsumer: () => setArgument('x-single-active-consumer', true),
        maxAge: (maxAge) => setArgument('x-max-age', maxAge),
        streamMaxSegmentSize: (bytes) => setArgument('x-stream-max-segment-size-bytes', bytes)
    };
};
