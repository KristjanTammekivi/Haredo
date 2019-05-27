import { Omit } from './events';
import { Options } from 'amqplib';
import { keyValuePairs, get } from './utils';

export interface ExtendedPublishType extends Omit<Options.Publish, 'headers'> {
    headers: {
        [header: string]: any;
        'x-delay'?: number;
    };
}

export interface PreparedMessageOptions {
    options?: Partial<ExtendedPublishType>;
    content?: string;
    routingKey?: string;
}

export class PreparedMessage<T = unknown> {
    public readonly content?: string;
    public readonly routingKey?: string;
    public readonly options: Partial<ExtendedPublishType>;
    constructor(settings: Partial<PreparedMessageOptions> = {}) {
        this.content = settings.content;
        this.routingKey = settings.routingKey;
        this.options = settings.options;
    }
    clone(newData: Partial<PreparedMessageOptions> = {}) {
        const newOpts = Object.assign(
            {},
            this.options,
            {
                ...newData.options,
                headers: Object.assign(
                    {},
                    get(this.options, opts => opts.headers) || {},
                    get(newData.options, opts => opts.headers) || {}
                )
            }
        );
        return new PreparedMessage<T>({
            routingKey: newData.routingKey || this.routingKey,
            content: newData.content || this.content,
            options: newOpts
        });
    }
    /**
     * Set string content of the essage
     */
    setContent(content: string) {
        return this.clone({ content });
    }
    /**
     * Set content-type header to application/json. If content is provided it
     * will be stringified and set as content
     */
    json(content?: T) {
        if (content) {
            return this
                .setHeader('Content-Type', 'application/json')
                .setContent(JSON.stringify(content));
        } else {
            return this.setHeader('Content-Type', 'application/json');
        }
    }
    /**
     * Set routing key do determine how this message will be routed
     */
    setRoutingKey(routingKey: string) {
        return this.clone({ routingKey });
    }
    /**
     * Set an arbitrary identifier for the originating application
     */
    appId(appId: string) {
        return this.clone({ options: { appId } });
    }
    /**
     * Set a MIME encoding for the message content
     */
    contentEncoding(contentEncoding: string) {
        return this.clone({ options: { contentEncoding } });
    }
    /**
     * Set a MIME type for the message content
     */
    contentType(contentType: string) {
        return this.clone({ options: { contentType } });
    }
    /**
     * Set a correlation id for the message (useful for an RPC scenario)
     */
    correlationId(correlationId: string) {
        return this.clone({ options: { correlationId } });
    }
    /**
     * Set the expiration time in milliseconds. The message will
     * be discarded after it's been in the queue for longer than that
     */
    expiration(expiration: number) {
        return this.clone({ options: { expiration } });
    }
    /**
     * Mandatory messages will be returned to sender if they're not routed
     * Haredo doesn't implement basic.return yet so this will not do anything
     */
    mandatory(mandatory: boolean = true) {
        return this.clone({ options: { mandatory } });
    }
    /**
     * Arbitrary application-specific identifier for the message
     */
    messageId(messageId: string) {
        return this.clone({ options: { messageId } });
    }
    /**
     * persistent messages survive broker restarts provided it's
     * in a queue that also survives restarts
     */
    persistent(persistent: boolean = true) {
        return this.clone({ options: { persistent } });
    }
    /**
     * A priority for the message. Only works with priority queues
     */
    priority(priority: number) {
        return this.clone({ options: { priority } });
    }
    /**
     * Often used to name a queue to which the receiving
     * application must send replies in an RPC scenario
     */
    replyTo(replyTo: string) {
        return this.clone({ options: { replyTo } });
    }
    /**
     * A timestamp for the message
     */
    timestamp(timestamp: number) {
        return this.clone({ options: { timestamp } });
    }
    /**
     * An arbitrary application-specific type for the message
     */
    type(type: string) {
        return this.clone({ options: { type } });
    }
    /**
     * If supplied, RabbitMQ will compare it to the username supplied when opening
     * the connection and r eject messages for which it does not match
     */
    userId(userId: string) {
        return this.clone({ options: { userId } });
    }
    /**
     * Set 'x-delay' header to delay a message in delayed exchanges
     */
    delay(ms: number) {
        return this.setHeader('x-delay', ms);
    }
    /**
     * Set message headers
     */
    setHeader(header: string, value: string | number) {
        return this.clone({
            options: {
                headers: Object.assign({}, this.options && this.options.headers || {}, {
                    [header]: value
                })
            }
        });
    }
    /**
     * Route the message to provided routing keys in addition to the main one
     */
    carbonCopy(recipients: string | string[]) {
        return this.clone({ options: { CC: recipients }});
    }
    /**
     * Same as .carbonCopy but the value will not be sent in message headers
     * to consumers
     */
    blindCarbonCopy(recipients: string | string[]) {
        return this.clone({ options: { BCC: recipients }});
    }
    toString() {
        return `PreparedMessage opts:${keyValuePairs(this.options).join(' ')}`.trim();
    }
}