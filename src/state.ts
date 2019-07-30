import { Exchange } from './exchange';
import { Queue } from './queue';
import { defaultToTrue, defaultTo } from './utils';
import { ConnectionManager } from './connection-manager';

export interface Middleware<T> {
    (message: any, next: () => Promise<void>): void | Promise<void>;
}

export interface StateExchangeCollection {
    exchange: Exchange;
    patterns: string[];
}

export interface HaredoChainState<T = unknown> {
    autoAck: boolean;
    prefetch: number;
    queue: Queue;
    bindings: StateExchangeCollection[];
    exchange: Exchange;
    failThreshold: number;
    failSpan: number;
    failTimeout: number;
    reestablish: boolean;
    json: boolean;
    confirm: boolean;
    skipSetup: boolean;
    middleware: Middleware<T>[];
    autoReply: boolean;
    connectionManager: ConnectionManager;
}

export const defaultState = <T>(newState: Partial<HaredoChainState<T>>) => {
    return {
        autoAck: defaultToTrue(newState.autoAck),
        autoReply: defaultTo(newState.autoReply, false),
        queue: newState.queue,
        bindings: [].concat(newState.bindings || []),
        prefetch: newState.prefetch || 0,
        reestablish: defaultToTrue(newState.reestablish),
        failSpan: newState.failSpan,
        failThreshold: newState.failThreshold,
        failTimeout: newState.failTimeout,
        json: defaultToTrue(newState.json),
        confirm: newState.confirm,
        skipSetup: newState.skipSetup,
        middleware: newState.middleware || []
    };
};
