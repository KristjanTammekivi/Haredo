import { QueueParams } from '@cloudamqp/amqp-client';
import { ExchangeInterface } from './exchange';

interface KnownQueueArguments {
    'x-dead-letter-exchange'?: string;
    'x-dead-letter-routing-key'?: string;
    'x-queue-type'?: 'quorum' | 'stream';
}

export type QueueArguments = Record<string, string | number> | KnownQueueArguments;

export const Queue = <T = unknown>(
    name?: string,
    // eslint-disable-next-line unicorn/prevent-abbreviations
    params: QueueParams = {},
    args = {} as QueueArguments
): QueueInterface<T> => {
    const setArgument: QueueInterface['setArgument'] = (key, value) => Queue(name, params, set(args, key, value));
    return {
        name,
        params,
        args,
        setArgument: setArgument,
        quorum: () => setArgument('x-queue-type', 'quorum'),
        stream: () => setArgument('x-queue-type', 'stream'),
        autoDelete: (autoDelete = true) => Queue(name, set(params, 'autoDelete', autoDelete), args),
        dead: (dlx, rk) =>
            setArgument('x-dead-letter-exchange', typeof dlx === 'string' ? dlx : dlx.name).setArgument(
                'x-dead-letter-routing-key',
                rk
            )
    };
};

const set = <T extends Record<string, any>>(object: T, key: keyof T, value: T[keyof T]): T => {
    return omitKeysByValue({ ...object, [key]: value });
};

const omitKeysByValue = <T extends Record<string, any>>(object: T, value?: T[keyof T] | undefined): T => {
    return Object.fromEntries(Object.entries(object).filter(([k, v]) => v !== value)) as T;
};

export interface QueueInterface<TMESSAGE = unknown> {
    name: string | undefined;
    params: QueueParams;
    args: QueueArguments;
    setArgument(key: keyof QueueArguments, value: QueueArguments[keyof QueueArguments]): QueueInterface<TMESSAGE>;
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
     * Set the dead letter exchange.
     */
    dead(deadLetterExchange: string | ExchangeInterface, rountingKey?: string): QueueInterface<TMESSAGE>;
}
