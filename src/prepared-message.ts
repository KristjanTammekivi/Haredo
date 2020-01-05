import { Options } from 'amqplib';

export interface ExtendedPublishOptions extends Omit<Options.Publish, 'headers'> {
    headers: {
        [header: string]: any;
        'x-delay'?: number;
    };
}

export interface MessageChainState<TMessage = unknown> {
    content: string;
    routingKey: string;
    options: Partial<ExtendedPublishOptions>;
}

export interface MessageChain<TMessage = unknown> {
    metaType: 'preparedMessage';
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
    json<TCustomMessage = TMessage>(data?: TCustomMessage): MessageChain<TCustomMessage>;
    /**
     * Mandatory messages will be returned to sender if they're not routed
     * Haredo doesn't implement basic.return yet so this will not do anything
     */
    mandatory(mandatory?: boolean): MessageChain<TMessage>;
    /**
     * Arbitrary application-specific identifier for the message
     */
    messageId(messageId: string): MessageChain<TMessage>;
    /**
     * persistent messages survive broker restarts provided it's
     * in a queue that also survives restarts
     */
    persistent(persistent?: boolean): MessageChain<TMessage>;
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
    return msg?.metaType === 'preparedMessage';
};

export const preparedMessage = <TMessage>(state: Partial<MessageChainState<TMessage>> = {}): MessageChain<TMessage> => {
    return {
        metaType: 'preparedMessage',
        getState: () => state,

        appId: (appId: string) => preparedMessage(mergeMessageState(state, { options: { appId } })),
        blindCarbonCopy: (...BCC: string[]) => preparedMessage(mergeMessageState(state, { options: { BCC } })),
        carbonCopy: (...CC: string[]) => preparedMessage(mergeMessageState(state, { options: { CC } })),
        contentEncoding: (contentEncoding: string) => preparedMessage(mergeMessageState(state, { options: { contentEncoding } })),
        contentType: (contentType: string) => preparedMessage(mergeMessageState(state, { options: { contentType } })),
        correlationId: (correlationId: string) => preparedMessage(mergeMessageState(state, { options: { correlationId } })),
        delay: (delay: number) => preparedMessage(state).setHeader('x-delay', delay),
        expiration: (expiration: number) => preparedMessage(mergeMessageState(state, { options: { expiration } })),
        json: <TCustomMessage = TMessage>(content?: TCustomMessage) => {
            const chain = preparedMessage(state).contentType('application/json');
            if (content !== undefined) {
                return chain.rawContent(JSON.stringify(content));
            }
            return chain;
        },
        mandatory: (mandatory = true) => preparedMessage(mergeMessageState(state, { options: { mandatory } })),
        messageId: (messageId: string) => preparedMessage(mergeMessageState(state, { options: { messageId } })),
        persistent: (persistent = true) => preparedMessage(mergeMessageState(state, { options: { persistent } })),
        priority: (priority: number) => preparedMessage(mergeMessageState(state, { options: { priority } })),
        rawContent: (content: string) => preparedMessage(mergeMessageState(state, { content })),
        replyTo: (replyTo: string) => preparedMessage(mergeMessageState(state, { options: { replyTo } })),
        routingKey: (routingKey: string) => preparedMessage(mergeMessageState(state, { routingKey })),
        timestamp: (timestamp: number) => preparedMessage(mergeMessageState(state, { options: { timestamp } })),
        type: (type: string) => preparedMessage(mergeMessageState(state, { options: { type } })),
        userId: (userId: string) => preparedMessage(mergeMessageState(state, { options: { userId } })),
        setHeader: (header: string, value: any) => preparedMessage(mergeMessageState(state, { options: { headers: { [header]: value } } })),
        setHeaders: (headers: Record<string, any>) => preparedMessage(mergeMessageState(state, { options: { headers } }))
    };
};

export const mergeMessageState = <TMessage>(base: Partial<MessageChainState<TMessage>>, top: Partial<MessageChainState<TMessage>>): MessageChainState<TMessage> => ({
    content: top.content || base.content,
    routingKey: top.routingKey || base.routingKey,
    options: mergeOptions(base.options, top.options)
});

export const mergeOptions = (base: Partial<ExtendedPublishOptions> = {}, top: Partial<ExtendedPublishOptions> = {}) => ({
    ...base,
    ...top,
    headers: mergeHeaders(base.headers, top.headers)
});

export const mergeHeaders = (base: Record<string, any> = {}, top: Record<string, any> = {}) => ({
    ...base,
    ...top
});
