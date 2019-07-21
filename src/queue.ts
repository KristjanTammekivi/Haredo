import { Options } from 'amqplib';
import { Exchange } from './exchange';
import { keyValuePairs, flatObjectIsEqual } from './utils';

export type QueueOptions = Options.AssertQueue;

export const DEFAULT_QUEUE_OPTIONS: QueueOptions = Object.freeze({
    durable: true,
    exclusive: false
});

export class Queue<TPublish = unknown, TReply = unknown> {
    opts: QueueOptions;
    anonymous: boolean;
    /**
     * Create a Queue configuration object. Note: this does not assert the queue
     *
     * @param name name of the queue, falsey value (including empty string) will make the server generate a name for you
     * @param opts queue options, passed to assertQueue
     * [amqplib#assertQueue](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue)
     */
    constructor(public name?: string, opts: Partial<QueueOptions> = { arguments: {} }) {
        this.opts = Object.assign({}, DEFAULT_QUEUE_OPTIONS, opts);
        this.anonymous = !this.name;
    }
    clone(opts: Partial<QueueOptions> = {}) {
        return new Queue<TPublish>(this.name, Object.assign({}, this.opts, opts));
    }
    /**
     * if true, the queue will survive broker restarts,
     * modulo the effects of exclusive and autoDelete;
     * this defaults to true if not supplied, unlike the others.
     */
    durable(durable = true) {
        return this.clone({ durable });
    }
    /**
     * if true, the queue will be deleted when the number
     * of consumers drops to zero (defaults to false)
     */
    autoDelete(autoDelete = true) {
        return this.clone({ autoDelete });
    }
    /**
     * if true, scopes the queue to the connection (defaults to false)
     */
    exclusive(exclusive = true) {
        return this.clone({ exclusive });
    }
    /**
     * expires messages arriving in the queue after n milliseconds
     */
    messageTtl(messageTtl: number) {
        return this.clone({ messageTtl });
    }
    /**
     * set a maximum number of messages the queue will hold. Old messages
     * will be discarded/dead lettered to make room for new ones
     */
    maxLength(maxLength: number) {
        return this.clone({ maxLength });
    }
    /**
    * the queue will be destroyed after n milliseconds of disuse,
    * where use means having consumers or being declared
    */
    expires(expires: number) {
        return this.clone({ expires });
    }
    /**
     * Add a dead letter exchange to route discarded messages to.
     * A message is discarded for any of 4 reasons
     * - Message expires
     * - Queue limit is reached
     * - Message is rejected (not implemented in Haredo)
     * - Message is nacked with requeue set to false
     */
    dead(deadLetterExchange: Exchange | string, deadLetterRoutingKey?: string) {
        if (deadLetterExchange instanceof Exchange) {
            deadLetterExchange = deadLetterExchange.name;
        }
        return this.clone({
            deadLetterRoutingKey,
            deadLetterExchange
        });
    }
    toString() {
        return `Queue${this.name ? padString(this.name) : ' '}opts:${keyValuePairs(this.opts).join(',')}`;
    }
    isEqual(queue: Queue) {
        return this.name && queue.name &&
            this.name === queue.name &&
            this.opts.autoDelete === queue.opts.autoDelete &&
            this.opts.deadLetterExchange === queue.opts.deadLetterExchange &&
            this.opts.deadLetterRoutingKey === queue.opts.deadLetterRoutingKey &&
            this.opts.durable === queue.opts.durable &&
            this.opts.exclusive === queue.opts.exclusive &&
            this.opts.expires === queue.opts.expires &&
            this.opts.maxLength === queue.opts.maxLength &&
            this.opts.maxPriority === queue.opts.maxPriority &&
            this.opts.messageTtl === queue.opts.messageTtl &&
            flatObjectIsEqual(this.opts.arguments, queue.opts.arguments);
    }
    isPerishable() {
        return this.opts.autoDelete || this.opts.exclusive || !this.opts.durable || !!this.opts.expires;
    }
}

const padString = (str: string) => ` ${str} `;
