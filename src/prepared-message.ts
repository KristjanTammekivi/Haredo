import { Omit } from './events';
import { Options } from 'amqplib';
import { keyValuePairs } from './utils';

export interface ExtendedPublishType extends Omit<Options.Publish, 'headers'> {
    headers: {
        [header: string]: any;
        'x-delay'?: number;
    };
}

export interface PreparedMessageOptions<T = unknown> {
    options?: Partial<ExtendedPublishType>;
    content?: T;
    routingKey?: string;
}

export class PreparedMessage<T = unknown> {
    public readonly content?: T;
    public readonly routingKey?: string;
    public readonly options: Partial<ExtendedPublishType>;
    constructor(settings: Partial<PreparedMessageOptions<T>>) {
        this.content = settings.content;
        this.routingKey = settings.routingKey;
        this.options = settings.options;
    }
    clone(newData: Partial<PreparedMessageOptions<T>> = {}) {
        return new PreparedMessage<T>({
            routingKey: newData.routingKey || this.routingKey,
            content: newData.content || this.content,
        });
    }
    setContent(content: T) {
        return this.clone({ content });
    }
    json(content?: T) {
        return this
            .setHeader('Content-Type', 'application/json')
            .setContent(content);
    }
    setRoutingKey(routingKey: string) {
        return this.clone({ routingKey });
    }
    appId(appId: string) {
        return this.clone({ options: { appId } });
    }
    contentEncoding(contentEncoding: string) {
        return this.clone({ options: { contentEncoding } });
    }
    contentType(contentType: string) {
        return this.clone({ options: { contentType } });
    }
    correlationId(correlationId: string) {
        return this.clone({ options: { correlationId } });
    }
    deliveryMode(deliveryMode: 1 | false | 2 | true) {
        return this.clone({ options: { deliveryMode } });
    }
    expiration(expiration: string | number) {
        return this.clone({ options: { expiration } });
    }
    mandatory(mandatory: boolean = true) {
        return this.clone({ options: { mandatory } });
    }
    messageId(messageId: string) {
        return this.clone({ options: { messageId } });
    }
    persistent(persistent: boolean = true) {
        return this.clone({ options: { persistent } });
    }
    priority(priority: number) {
        return this.clone({ options: { priority } });
    }
    replyTo(replyTo: string) {
        return this.clone({ options: { replyTo } });
    }
    timestamp(timestamp: number) {
        return this.clone({ options: { timestamp } });
    }
    type(type: string) {
        return this.clone({ options: { type } });
    }
    userId(userId: string) {
        return this.clone({ options: { userId } });
    }
    delay(ms: number) {
        return this.setHeader('x-delay', ms);
    }
    setHeader(header: string, value: string | number) {
        return this.clone({
            options: {
                headers: Object.assign({}, this.options.headers || {}, {
                    [header]: value
                })
            }
        });
    }
    toString() {
        return `PreparedMessage opts:${keyValuePairs(this.options).join(' ')}`.trim();
    }
}