import { Options } from 'amqplib';
import { Exchange } from './exchange';

export interface QueueOptions extends Options.AssertQueue {
    preferences?: {
        passive?: boolean;
    };
}

export const DEFAULT_QUEUE_OPTIONS: QueueOptions = Object.freeze({
    durable: true,
    exclusive: false
});

export interface Queue<TPublish = unknown, TReply = unknown> {
    metaType: 'queue';
    getName(): string;
    getOpts(): QueueOptions;
    /**
     * if true, the queue will survive broker restarts,
     * modulo the effects of exclusive and autoDelete;
     * this defaults to true if not supplied, unlike the others.
     */
    durable(durable?: boolean): Queue<TPublish, TReply>;
    /**
     * if true, the queue will be deleted when the number
     * of consumers drops to zero (defaults to false)
     */
    autoDelete(autoDelete?: boolean): Queue<TPublish, TReply>;
    /**
     * if true, scopes the queue to the connection (defaults to false)
     */
    exclusive(exclusive?: boolean): Queue<TPublish, TReply>;
    /**
     * expires messages arriving in the queue after n milliseconds
     */
    messageTtl(messageTtl: number): Queue<TPublish, TReply>;
    /**
     * set a maximum number of messages the queue will hold. Old messages
     * will be discarded/dead lettered to make room for new ones
     */
    maxLength(maxLength: number): Queue<TPublish, TReply>;
    /**
     * the queue will be destroyed after n milliseconds of disuse,
     * where use means having consumers or being declared
     */
    expires(expires: number): Queue<TPublish, TReply>;
    /**
    * Add a dead letter exchange to route discarded messages to.
    * A message is discarded for any of 4 reasons
    * - Message expires
    * - Queue limit is reached
    * - Message is rejected (not implemented in Haredo)
    * - Message is nacked with requeue set to false
    */
    dead(dlx: string | Exchange, deadLetterRoutingKey?: string): Queue<TPublish, TReply>;
    /**
     * set the name of the queue. Empty string will cause the server to assign
     * a name for it.
     */
    name(name: string): Queue<TPublish, TReply>;
    /**
     * Made for internal use. Mutates the state instead of doing the usual thing of returning
     * a brand new object
     */
    mutateName(name: string): void;
    /**
     * Declare the queue as a priority queue and set the maximum priority the
     * queue should support. Read more at [rabbitmq.com](https://www.rabbitmq.com/priority.html)
     * @param priority integer between 1 and 255
     */
    maxPriority(priority: number): Queue<TPublish, TReply>;
    /**
     * Set the type of the queue. Available choices are 'classic' or 'quorum'
     * (the latter available since [RabbitMQ 3.8.0](https://www.rabbitmq.com/quorum-queues.html))
     */
    type(type: 'classic' | 'quorum'): Queue<TPublish, TReply>;
    /**
     * Don't assert the queue (if queue doesn't exist then create it, if it exists but with a different
     * configuration, then throw an error) but just check it (if queue doesn't exist then throw an error)
     * @param passive true to do a checkQueue instead of assertQueue
     */
    passive(passive?: boolean): Queue<TPublish, TReply>;
}

    /**
     * Create a queue configuration object. Note: this does not assert the queue
     *
     * @param name name of the queue, falsey value (including empty string) will make the server generate a name for you
     * @param opts queue options, passed to assertQueue
     * [amqplib#assertQueue](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue)
     */
export const makeQueueConfig = <TPublish = unknown, TReply = unknown>(name?: string, opts: Partial<QueueOptions> = {}): Queue<TPublish, TReply> => {
    const cloneOpts = (top: Partial<QueueOptions>): QueueOptions => ({
        ...opts,
        ...top,
        arguments: {
            ...opts?.arguments,
            ...top?.arguments
        }
    });
    return {
        metaType: 'queue',
        getName: () => name,
        getOpts: () => cloneOpts(opts),
        durable: (durable = true) => makeQueueConfig(name, cloneOpts({ durable })),
        autoDelete: (autoDelete = true) => makeQueueConfig(name, cloneOpts({ autoDelete })),
        exclusive: (exclusive = true) => makeQueueConfig(name, cloneOpts({ exclusive })),
        messageTtl: (messageTtl: number) => makeQueueConfig(name, cloneOpts({ messageTtl })),
        maxLength: (maxLength: number) => makeQueueConfig(name, cloneOpts({ maxLength })),
        expires: (expires: number) => makeQueueConfig(name, cloneOpts({ expires })),
        dead: (deadLetterExchange: string | Exchange, deadLetterRoutingKey?: string) => {
            if (typeof deadLetterExchange !== 'string') {
                deadLetterExchange = deadLetterExchange.getName();
            }
            return makeQueueConfig(name, cloneOpts({ deadLetterExchange, deadLetterRoutingKey }));
        },
        name: (name: string) => makeQueueConfig(name, cloneOpts({})),
        mutateName: (newName: string) => { name = newName; },
        maxPriority: priority => makeQueueConfig(name, cloneOpts({ arguments: { 'x-max-priority': priority } })),
        type: type => makeQueueConfig(name, cloneOpts({ arguments: { 'x-queue-type': type } })),
        passive: (passive = true) => makeQueueConfig(name, cloneOpts({ preferences: { passive } }))
    };
};

export const padString = (str: string) => ` ${str} `;

/**
 * Returns true if passed in object is an queue. Acts as a type guard for Queue.
 * @param obj Object to check
 */
export const isHaredoQueue = (obj: any): obj is Queue => {
    return obj?.metaType === 'queue';
};
