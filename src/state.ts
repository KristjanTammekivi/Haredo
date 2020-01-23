import { Exchange } from './exchange';
import { Queue } from './queue';
import { ConnectionManager } from './connection-manager';
import { HaredoMessage } from './haredo-message';
import { FailureBackoff } from './backoffs';

export interface Middleware<TMessage = unknown, TReply = unknown> {
    /**
     * @param message The received message
     * @param next A function that returns a promise for the next item in the callback stack.
     * If you don't call it and don't ack/nack the message then it will be called for you
     */
    (message: HaredoMessage<TMessage, TReply>, next: () => Promise<void>): void | Promise<void>;
}

export interface StateExchangeCollection {
    exchange: Exchange;
    patterns: string[];
}

export type Component = 'ConnectionManager' | 'RPC' | 'Consumer' | 'Publisher' | 'MessageManager';

export type logger = (component: Component, ...msg: any[]) => void;

export interface Loggers {
    debug: logger;
    info: logger;
    warning: logger;
    error: logger;
}

export interface HaredoChainState<TMessage = unknown, TReply = unknown> {
    autoAck: boolean;
    prefetch: number;
    queue: Queue;
    bindings: StateExchangeCollection[];
    exchange: Exchange;
    backoff: FailureBackoff;
    reestablish: boolean;
    json: boolean;
    confirm: boolean;
    skipSetup: boolean;
    middleware: Middleware<TMessage, TReply>[];
    autoReply: boolean;
    connectionManager: ConnectionManager;
    priority: number;
    noAck: boolean;
    exclusive: boolean;
    log: Loggers;
}

export const defaultState = <TMessage, TReply>(): Partial<HaredoChainState<TMessage, TReply>> => {
    return {
        autoAck: true,
        autoReply: false,
        queue: undefined,
        bindings: [],
        prefetch: 0,
        reestablish: true,
        backoff: undefined,
        json: true,
        confirm: undefined,
        skipSetup: undefined,
        middleware: [],
        log: undefined
    };
};
