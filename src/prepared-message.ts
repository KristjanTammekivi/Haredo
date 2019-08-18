import { Options } from 'amqplib';

export interface ExtendedPublishType extends Omit<Options.Publish, 'headers'> {
    headers: {
        [header: string]: any;
        'x-delay'?: number;
    };
}

export interface MessageChainState<TMessage = unknown> {
    content: string;
    routingKey: string;
    options: Partial<ExtendedPublishType>;
}

export interface MessageChain<TMessage = unknown> {
    getState(): Partial<MessageChainState<TMessage>>;

    /**
     * Set an arbitrary identifier for the originating application
     */
    appId(appId: string): MessageChain<TMessage>;
    /**
     * Same as .carbonCopy but the value will not be sent in message headers
     * to consumers
     */
    blindCarbonCopy(...BCC: string[]): MessageChain<TMessage>;
    /**
     * Route the message to provided routing keys in addition to the main one
     */
    carbonCopy(...CC: string[]): MessageChain<TMessage>;
    /**
     * Set a MIME encoding for the message content
     */
    contentEncoding(contentEncoding: string): MessageChain<TMessage>;
    /**
     * Set a MIME type for the message content
     */
    contentType(contentType: string): MessageChain<TMessage>;
    /**
     * Set a correlation id for the message (useful for an RPC scenario)
     */
    correlationId(correlationId: string): MessageChain<TMessage>;
    /**
     * Set 'x-delay' header to delay a message in delayed exchanges
     */
    delay(delay: number): MessageChain<TMessage>;
    /**
     * Set the expiration time in milliseconds. The message will
     * be discarded after it's been in the queue for longer than that
     */
    expiration(expiration: number): MessageChain<TMessage>;
    /**
     * Set content-type header to application/json. If content is provided it
     * will be stringified and set as content
     */
    json(data?: TMessage): MessageChain<TMessage>;
    /**
     * Mandatory messages will be returned to sender if they're not routed
     * Haredo doesn't implement basic.return yet so this will not do anything
     */
    mandatory(mandatory: boolean): MessageChain<TMessage>;
    /**
     * Arbitrary application-specific identifier for the message
     */
    messageId(messageId: string): MessageChain<TMessage>;
    /**
     * persistent messages survive broker restarts provided it's
     * in a queue that also survives restarts
     */
    persistent(persistent: boolean): MessageChain<TMessage>;
    /**
     * A priority for the message. Only works with priority queues
     */
    priority(priority: number): MessageChain<TMessage>;
    /**
     * Set string content of the message
     */
    rawContent(rawContent: string): MessageChain<TMessage>;
    /**
     * Often used to name a queue to which the receiving
     * application must send replies in an RPC scenario
     */
    replyTo(replyTo: string): MessageChain<TMessage>;
    /**
     * Set routing key do determine how this message will be routed
     */
    routingKey(routingKey: string): MessageChain<TMessage>;
    /**
     * A timestamp for the message
     */
    timestamp(timestamp: number): MessageChain<TMessage>;
    /**
     * An arbitrary application-specific type for the message
     */
    type(type: string): MessageChain<TMessage>;
    /**
     * If supplied, RabbitMQ will compare it to the username supplied when opening
     * the connection and reject messages for which it does not match
     */
    userId(userId: string): MessageChain<TMessage>;
    /**
     * Set a specific message header
     */
    setHeader(header: string, value: string | number): MessageChain<TMessage>;
    /**
     * Set message headers
     */
    setHeaders(headers: Record<string, any>): MessageChain<TMessage>;
}

export const isMessageChain = (msg: any): msg is MessageChain => {
    return msg && !!msg.getState;
};

export const messageChain = <TMessage>(state: Partial<MessageChainState<TMessage>> = {}): MessageChain<TMessage> => {
    return {
        getState: () => state,

        appId: (appId: string) => messageChain(mergeMessageState(state, { options: { appId } })),
        blindCarbonCopy: (...BCC: string[]) => messageChain(mergeMessageState(state, { options: { BCC } })),
        carbonCopy: (...CC: string[]) => messageChain(mergeMessageState(state, { options: { CC } })),
        contentEncoding: (contentEncoding: string) => messageChain(mergeMessageState(state, { options: { contentEncoding } })),
        contentType: (contentType: string) => messageChain(mergeMessageState(state, { options: { contentType } })),
        correlationId: (correlationId: string) => messageChain(mergeMessageState(state, { options: { correlationId } })),
        delay: (delay: number) => messageChain(state).setHeader('x-delay', delay),
        expiration: (expiration: number) => messageChain(mergeMessageState(state, { options: { expiration } })),
        json: (content?: TMessage) => {
            const chain = messageChain(state).contentType('application/json');
            if (content !== undefined) {
                return chain.rawContent(JSON.stringify(content));
            }
            return chain;
        },
        mandatory: (mandatory: boolean) => messageChain(mergeMessageState(state, { options: { mandatory } })),
        messageId: (messageId: string) => messageChain(mergeMessageState(state, { options: { messageId } })),
        persistent: (persistent: boolean) => messageChain(mergeMessageState(state, { options: { persistent } })),
        priority: (priority: number) => messageChain(mergeMessageState(state, { options: { priority } })),
        rawContent: (content: string) => messageChain(mergeMessageState(state, { content })),
        replyTo: (replyTo: string) => messageChain(mergeMessageState(state, { options: { replyTo } })),
        routingKey: (routingKey: string) => messageChain(mergeMessageState(state, { routingKey })),
        timestamp: (timestamp: number) => messageChain(mergeMessageState(state, { options: { timestamp } })),
        type: (type: string) => messageChain(mergeMessageState(state, { options: { type } })),
        userId: (userId: string) => messageChain(mergeMessageState(state, { options: { userId } })),
        setHeader: (header: string, value: any) => messageChain(mergeMessageState(state, { options: { headers: { [header]: value } } })),
        setHeaders: (headers: Record<string, any>) => messageChain(mergeMessageState(state, { options: { headers } }))
    };
};

export const mergeMessageState = <TMessage>(base: Partial<MessageChainState<TMessage>> = {}, top: Partial<MessageChainState<TMessage>> = {}): MessageChainState<TMessage> => ({
    content: top.content || base.content,
    routingKey: top.routingKey || base.routingKey,
    options: mergeOptions(base.options, top.options)
});

export const mergeOptions = (base: Partial<ExtendedPublishType> = {}, top: Partial<ExtendedPublishType> = {}) => ({
    ...base,
    ...top,
    headers: mergeHeaders(base.headers, top.headers)
});

export const mergeHeaders = (base: Record<string, any> = {}, top: Record<string, any> = {}) => ({
    ...base,
    ...top
});
