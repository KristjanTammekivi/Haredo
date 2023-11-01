import { AMQPTlsOptions, ExchangeParams } from '@cloudamqp/amqp-client';
import { Adapter } from './adapter';
import { ExchangeArguments, ExchangeInterface, ExchangeType } from './exchange';
import { QueueInterface } from './queue';
import { Middleware } from './utils/apply-middleware';
import { FailureBackoff } from './backoffs';
import { HaredoMessage } from './haredo-message';

export interface HaredoInstance {
    connect(): Promise<void>;
    exchange<T = unknown>(exchange: ExchangeInterface<T>): ExchangeChain<T>;

    exchange<T = unknown>(
        exchange: string,
        type: ExchangeType,
        parameters?: ExchangeParams,
        args?: ExchangeArguments
    ): ExchangeChain<T>;
    queue<T = unknown>(queue: string | QueueInterface<T>): QueueChain<T>;
    close(): Promise<void>;
}

export interface HaredoOptions {
    url: string | RabbitUrl;
    tlsOptions?: AMQPTlsOptions;
    adapter?: Adapter;
}
export interface RabbitUrl {
    protocol: 'amqp' | 'amqps';
    username: string;
    password: string;
    hostname: string;
    port: number;
    vhost: string;
}

export interface SharedChain {
    setup: () => Promise<void>;
    confirm: () => this;
    json: (stringify?: boolean) => this;
}
export interface ExchangeChain<T = unknown> extends SharedChain {
    skipSetup: (skip?: boolean) => ExchangeChain<T>;
    publish: (message: T, routingKey: string) => Promise<void>;
    delay: (milliseconds: number) => ExchangeChain<T>;
}

export type SubscribeCallback<T> = (data: T, message: HaredoMessage<T>) => any;

export interface QueueChain<T = unknown> extends SharedChain, QueueSubscribeChain<T>, QueuePublishChain<T> {
    skipSetup: () => QueueChain<T>;
}

export interface QueuePublishChain<T> {
    publish: (message: T) => Promise<void>;
}

export interface HaredoConsumer {
    cancel: () => Promise<void>;
}

export interface QueueSubscribeChain<T> {
    subscribe(callback: SubscribeCallback<T>): Promise<HaredoConsumer>;
    use(...middleware: Middleware<T>[]): QueueSubscribeChain<T>;
    concurrency(count: number): QueueSubscribeChain<T>;
    prefetch(count: number): QueueSubscribeChain<T>;
    backoff(backoff: FailureBackoff): QueueSubscribeChain<T>;
    bindExchange(name: string, routingKey: string | string[], type: ExchangeType): QueueSubscribeChain<T>;
    bindExchange(exchange: ExchangeInterface, routingKey: string | string[]): QueueSubscribeChain<T>;
}

export interface ChainState {
    adapter: Adapter;
    skipSetup?: boolean;
    confirm?: boolean;
    json?: boolean;
    bindings?: { exchange: ExchangeInterface; pattern: string }[];
    headers?: Record<string, string | number>;
}

export interface QueueChainState<T> extends ChainState {
    queue: QueueInterface;
    middleware: Middleware<T>[];
    prefetch?: number;
    backoff?: FailureBackoff;
}

export interface ExchangeChainState extends ChainState {
    exchange: ExchangeInterface;
}
