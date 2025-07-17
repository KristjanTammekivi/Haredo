import type { ExchangeParams, QueueParams } from '@cloudamqp/amqp-client';
import { SubscribeOptions, makeHaredoMessage, TypedEventEmitter, Adapter, AdapterEvents } from 'haredo/internals';
import { deepEqual } from 'node:assert';
import { SinonStub, SinonStubbedInstance, stub } from 'sinon';
import { HaredoTestAdapterError } from './errors';
import type { HaredoMessage, ExchangeArguments, ExchangeType, QueueArguments, PublishOptions } from 'haredo/types';

export interface Queue {
    name: string;
    params: QueueParams;
    arguments: QueueArguments;
}

export interface Exchange {
    name: string;
    type: ExchangeType;
    params: ExchangeParams;
    arguments: ExchangeArguments;
}

export interface Subscriber {
    queue: string;
    options: SubscribeOptions;
    callback: any;
}

export interface TestAdapter extends Adapter {
    reset: () => void;
    queues: Queue[];
    exchanges: Exchange[];
    subscribers: Subscriber[];
    publishedMessages: PublishedMessage[];
    callSubscriber(queueName: string, message: string): Promise<SinonStubbedInstance<HaredoMessage>>;
}

export type HaredoTestAdapter = SinonStubbedInstance<TestAdapter>;
export interface PublishedMessage {
    type: 'queue' | 'exchange';
    destination: string;
    routingKey?: string;
    raw: string;
    parsed: any;
    options: PublishOptions;
}

export const createTestAdapter = (): SinonStubbedInstance<TestAdapter> => {
    const emitter = new TypedEventEmitter<AdapterEvents>();

    let mockedAdapter: SinonStubbedInstance<TestAdapter>;

    let queues: Queue[] = [];
    let exchanges: Exchange[] = [];
    let subscribers: Subscriber[] = [];

    let publishedMessages: PublishedMessage[] = [];

    const createSpies = () => {
        queues = [];
        exchanges = [];
        subscribers = [];
        publishedMessages = [];
        mockedAdapter = stub({
            reset: () => {
                createSpies();
            },
            queues,
            exchanges,
            subscribers,
            publishedMessages,
            emitter,
            connect: async () => {
                emitter.emit('connected', null);
            },
            close: async () => {
                emitter.emit('disconnected', null);
                subscribers.length = 0;
            },
            createQueue: (async (name, params = {}, args = {}) => {
                name = name || `testqueue-${ Math.random() }`;
                const existingQueue = queues.find((q) => q.name === name);
                if (existingQueue) {
                    deepEqual(existingQueue.arguments, args, `Queue arguments do not match for queue ${ name }`);
                    deepEqual(existingQueue.params, params, `Queue params do not match for queue ${ name }`);
                } else {
                    queues.push({
                        name,
                        params,
                        arguments: args
                    });
                }
                return name;
            }) as Adapter['createQueue'],
            createExchange: (async (name, type: ExchangeType, params = {}, args = {}) => {
                const existingExchange = exchanges.find((exchange) => exchange.name === name);
                if (existingExchange) {
                    deepEqual(
                        existingExchange.arguments,
                        args,
                        `Exchange arguments do not match for exchange ${ name }`
                    );
                    deepEqual(existingExchange.params, params, `Exchange params do not match for exchange ${ name }`);
                    deepEqual(existingExchange.type, type, `Exchange type does not match for exchange ${ name }`);
                } else {
                    exchanges.push({
                        name,
                        type,
                        params,
                        arguments: args
                    });
                }
            }) as Adapter['createExchange'],
            bindExchange: (async () => {}) as Adapter['bindExchange'],
            bindQueue: (async () => {}) as Adapter['bindQueue'],
            deleteExchange: (async () => {}) as Adapter['deleteExchange'],
            deleteQueue: (async () => {}) as Adapter['deleteQueue'],
            publish: (async (destination, routingKey, message, options) => {
                publishedMessages.push({
                    type: 'exchange',
                    destination,
                    raw: message,
                    parsed: tryParse(message),
                    routingKey,
                    options
                });
            }) as Adapter['publish'],
            subscribe: async (name: string, options: any, callback: any) => {
                subscribers.push({
                    queue: name,
                    options,
                    callback
                });
                return {
                    cancel: async () => {
                        const index = subscribers.findIndex((s) => s.queue === name);
                        if (index === -1) {
                            throw new HaredoTestAdapterError(`Could not find subscriber with queue ${ name }`);
                        }
                        subscribers.splice(index, 1);
                    }
                };
            },
            purgeQueue: (async () => {}) as Adapter['purgeQueue'],
            sendToQueue: (async (destination, message, options) => {
                publishedMessages.push({
                    type: 'queue',
                    destination,
                    raw: message,
                    parsed: tryParse(message),
                    options
                });
            }) as Adapter['sendToQueue'],
            unbindExchange: (async () => {}) as Adapter['unbindExchange'],
            unbindQueue: (async () => {}) as Adapter['unbindQueue'],
            callSubscriber: async (queue: string, message: string) => {
                const subscriber = subscribers.find((s) => s.queue === queue);
                if (!subscriber) {
                    throw new HaredoTestAdapterError(`Could not find subscriber with queue ${ queue }`);
                }
                const haredoMessage = stub(
                    makeHaredoMessage(
                        {
                            bodyString: () => message,
                            properties: {},
                            ack: () => {},
                            nack: () => {}
                        } as any,
                        subscriber.options.parseJson ?? true,
                        queue
                    )
                );
                await subscriber.callback(haredoMessage);
                return haredoMessage;
            }
        });

        for (const key of Object.keys(mockedAdapter)) {
            if (typeof mockedAdapter[key as keyof TestAdapter] === 'function') {
                const value = mockedAdapter[key as keyof TestAdapter] as SinonStub;
                value.callThrough();
            }
        }
    };

    createSpies();

    return new Proxy<SinonStubbedInstance<TestAdapter>>({} as any, {
        get: (target, key) => {
            if (key === 'reset') {
                return () => {
                    createSpies();
                };
            }

            return mockedAdapter[key as keyof TestAdapter];
        }
    });
};

const tryParse = (message: string) => {
    try {
        return JSON.parse(message);
    } catch {
        return;
    }
};
