import { Options } from 'amqplib';
import { Exchange } from './exchange';
import { keyValuePairs, flatObjectIsEqual } from './utils';

export type QueueOptions = Options.AssertQueue;

export const DEFAULT_QUEUE_OPTIONS: QueueOptions = Object.freeze({
    durable: true,
    exclusive: false
});

export class Queue<T = unknown> {
    opts: QueueOptions;
    constructor(public name?: string, opts: Partial<QueueOptions> = {}) {
        this.opts = Object.assign({}, DEFAULT_QUEUE_OPTIONS, opts);
    }
    private clone(opts: Partial<QueueOptions> = {}) {
        return new Queue<T>(this.name, Object.assign({}, this.opts, opts));
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
    * the queue will be destroyed after n milliseconds of disuse,
    * where use means having consumers or being declared
    */
    expires(expires: number) {
        return this.clone({ expires });
    }
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
        return `Queue${this.name ? ` ${this.name} ` : ' '}opts:${keyValuePairs(this.opts).join(',')}`;
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
}
