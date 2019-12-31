import { Options } from 'amqplib';
import { Exchange } from './exchange';

export type QueueOptions = Options.AssertQueue;

export const DEFAULT_QUEUE_OPTIONS: QueueOptions = Object.freeze({
    durable: true,
    exclusive: false
});

export interface Queue<TPublish = unknown, TReply = unknown> {
    metaType: 'queue';
    getName: () => string;
    getOpts: () => QueueOptions;
    /**
     * if true, the queue will survive broker restarts,
     * modulo the effects of exclusive and autoDelete;
     * this defaults to true if not supplied, unlike the others.
     */
    durable: (durable?: boolean) => Queue<TPublish, TReply>;
    /**
     * if true, the queue will be deleted when the number
     * of consumers drops to zero (defaults to false)
     */
    autoDelete: (autoDelete?: boolean) => Queue<TPublish, TReply>;
    /**
     * if true, scopes the queue to the connection (defaults to false)
     */
    exclusive: (exclusive?: boolean) => Queue<TPublish, TReply>;
    /**
     * expires messages arriving in the queue after n milliseconds
     */
    messageTtl: (messageTtl: number) => Queue<TPublish, TReply>;
    /**
     * set a maximum number of messages the queue will hold. Old messages
     * will be discarded/dead lettered to make room for new ones
     */
    maxLength: (maxLength: number) => Queue<TPublish, TReply>;
    /**
     * the queue will be destroyed after n milliseconds of disuse,
     * where use means having consumers or being declared
     */
    expires: (expires: number) => Queue<TPublish, TReply>;
    /**
    * Add a dead letter exchange to route discarded messages to.
    * A message is discarded for any of 4 reasons
    * - Message expires
    * - Queue limit is reached
    * - Message is rejected (not implemented in Haredo)
    * - Message is nacked with requeue set to false
    */
    dead: (dlx: string | Exchange, deadLetterRoutingKey?: string) => Queue<TPublish, TReply>;
    /**
     * set the name of the queue. Empty string will cause the server to assign
     * a name for it.
     */
    name: (name: string) => Queue<TPublish, TReply>;
    /**
     * Made for internal use. Mutates the state instead of doing the usual thing of returning
     * a brand new object
     */
    mutateName: (name: string) => void;
}

    /**
     * Create a queue configuration object. Note: this does not assert the queue
     *
     * @param name name of the queue, falsey value (including empty string) will make the server generate a name for you
     * @param opts queue options, passed to assertQueue
     * [amqplib#assertQueue](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue)
     */
export const makeQueue = <TPublish = unknown, TReply = unknown>(name?: string, opts: Partial<QueueOptions> = {}): Queue<TPublish, TReply> => {
    const cloneOpts = (top: Partial<QueueOptions>): QueueOptions => ({
        ...opts,
        ...top,
    });
    return {
        metaType: 'queue',
        getName: () => name,
        getOpts: () => cloneOpts(opts),
        durable: (durable = true) => makeQueue(name, cloneOpts({ durable })),
        autoDelete: (autoDelete = true) => makeQueue(name, cloneOpts({ autoDelete })),
        exclusive: (exclusive = true) => makeQueue(name, cloneOpts({ exclusive })),
        messageTtl: (messageTtl: number) => makeQueue(name, cloneOpts({ messageTtl })),
        maxLength: (maxLength: number) => makeQueue(name, cloneOpts({ maxLength })),
        expires: (expires: number) => makeQueue(name, cloneOpts({ expires })),
        dead: (deadLetterExchange: string | Exchange, deadLetterRoutingKey?: string) => {
            if (typeof deadLetterExchange !== 'string') {
                deadLetterExchange = deadLetterExchange.getName();
            }
            return makeQueue(name, cloneOpts({ deadLetterExchange, deadLetterRoutingKey }));
        },
        name: (name: string) => makeQueue(name, cloneOpts({})),
        mutateName: (newName: string) => { name = newName; }
    };
};

export const padString = (str: string) => ` ${str} `;
