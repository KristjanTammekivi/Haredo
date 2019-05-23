import { Options } from 'amqplib';
import { Exchange } from './exchange';
import { keyValuePairs } from './utils';

export type QueueOptions = Options.AssertQueue;

export const DEFAULT_QUEUE_OPTIONS: Options.AssertQueue = Object.freeze({
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
    * where use means having consumers
    */
    expires(expires: number) {
        return this.clone({ expires });
    }
    // TODO: dead letter queue
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
}
export const queue = <T = unknown>(name?: string, opts: Partial<QueueOptions> = {}) => {
    return new Queue<T>(name, opts);
}
