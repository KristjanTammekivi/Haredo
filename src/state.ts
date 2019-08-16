import { Exchange } from './exchange';
import { Queue } from './queue';
import { defaultToTrue, defaultTo } from './utils';
import { ConnectionManager } from './connection-manager';
import { HaredoMessage } from './haredo-message';

export interface Middleware<TMessage, TReply> {
    (message: HaredoMessage<TMessage, TReply>, next: () => Promise<void>): void | Promise<void>;
}

export interface StateExchangeCollection {
    exchange: Exchange;
    patterns: string[];
}

export interface HaredoChainState<TMessage = unknown, TReply = unknown> {
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
    middleware: Middleware<TMessage, TReply>[];
    autoReply: boolean;
    connectionManager: ConnectionManager;
}

export const defaultState = <TMessage, TReply>(newState: Partial<HaredoChainState<TMessage, TReply>>) => {
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
