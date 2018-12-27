import { ExtendedPublishType, omit, keyValuePairs } from './utils';

type ExtendedPublish<T = unknown> = ExtendedPublishType & {
    content: T,
    routingKey?: string
};

export class PreparedMessage<T = unknown> {
    constructor(public readonly settings: Partial<ExtendedPublish<T>> = {}) { };
    getContent(strict = false): T {
        if (strict && !this.settings.content) {
            throw new Error(`Content is not set and strict is true`);
        }
        return this.settings.content;
    }
    getRoutingKey(strict = false) {
        if (strict && !this.settings.routingKey) {
            throw new Error('Routing key for message is not set and strict is true')
        }
        return this.settings.routingKey
    }
    getOptions() {
        return omit(this.settings, 'content', 'routingKey');
    }
    content(content: T) {
        return this.clone({ content });
    }
    json(content: T) {
        return this.setHeader('Content-Type', 'application/json')
            .content(content);
    }
    routingKey(routingKey: string) {
        return this.clone({ routingKey });
    }
    /**
     * clone the prepared message
     */
    clone(newData: Partial<ExtendedPublish>) {
        return new PreparedMessage<T>(Object.assign({}, this.settings, newData));
    }
    /**
     * set delay for message
     */
    delay(ms: number) {
        return this.setHeader('x-delay', ms);
    }
    /**
     * an arbitrary identifier for the originating application
     */
    appId(appId: string) {
        return this.clone({ appId });
    }
    /**
     * a MIME encoding for the message content
     */
    contentEncoding(contentEncoding: string) {
        return this.clone({ contentEncoding });
    }
    /**
     * a MIME type for the message content
     */
    contentType(contentType: string) {
        return this.clone({ contentType });
    }
    /**
     * If supplied, RabbitMQ will compare it to the username supplied when
     * opening the connection, and reject messages for which it does not match
     */
    correlationId(correlationId: string) {
        return this.clone({ correlationId });
    }
    /**
     * Either 1 or falsey, meaning non-persistent; or, 2 or truthy, meaning
     * persistent. That’s just obscure though. Use the persistent instead.
     */
    deliveryMode(deliveryMode: 1 | false | 2 | true) {
        return this.clone({ deliveryMode });
    }
    /**
     * if supplied, the message will be discarded from a queue once it’s been
     * there longer than the given number of milliseconds. In the specification
     * this is a string; numbers supplied here will be coerced to strings for transit
     */
    expiration(expiration: string | number) {
        return this.clone({ expiration });
    }
    /**
     * if true, the message will be returned if it is not routed to a queue
     */
    mandatory(mandatory: boolean = true) {
        return this.clone({ mandatory });
    }
    /**
     * arbitrary application-specific identifier for the message
     */
    messageId(messageId: string) {
        return this.clone({ messageId });
    }
    /**
     * If truthy, the message will survive broker restarts provided it’s
     * in a queue that also survives restarts.
     * Corresponds to, and overrides deliveryMode
     */
    persistent(persistent: boolean = true) {
        return this.clone({ persistent });
    }
    /**
     * a priority for the message; ignored by versions of RabbitMQ older
     * than 3.5.0, or if the queue is not a priority queue
     */
    priority(priority: number) {
        return this.clone({ priority });
    }
    /**
     * used for RPC
     */
    replyTo(replyTo: string) {
        return this.clone({ replyTo });
    }
    /**
     * a timestamp for the message
     */
    timestamp(timestamp: number) {
        return this.clone({ timestamp });
    }
    /**
     * an arbitrary application-specific type for the message
     */
    type(type: string) {
        return this.clone({ type });
    }
    /**
     * If supplied, RabbitMQ will compare it to the username supplied when
     * opening the connection, and reject messages for which it does not match.
     */
    userId(userId: string) {
        return this.clone({ userId });
    }
    /**
     * set a header
     */
    setHeader(header: string, value: string | number) {
        return this.clone({
            headers: Object.assign({}, this.settings.headers, {
                [header]: value
            })
        });
    };

    toString() {
        return `PreparedMessage opts:${keyValuePairs(this.settings).join(' ')}`.trim();
    }
}
