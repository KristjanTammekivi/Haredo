import { Exchange } from './exchange';
import { Queue } from './queue';
import { HaredoMessage } from './haredo-message';
import { defaultToTrue, defaultTo } from './utils';

export interface Middleware<T> {
    (message: HaredoMessage<T>, next: () => Promise<void>): void | Promise<void>;
}

export interface StateExchangeCollection {
    exchange: Exchange;
    patterns: string[];
}

export interface HaredoChainState<T = unknown> {
    autoAck: boolean;
    prefetch: number;
    queue: Queue<T>;
    exchanges: StateExchangeCollection[];
    failThreshold: number;
    failSpan: number;
    failTimeout: number;
    reestablish: boolean;
    json: boolean;
    confirm: boolean;
    skipSetup: boolean;
    middleware: Middleware<T>[];
    autoReply: boolean;
}

export const defaultState = <T>(newState: Partial<HaredoChainState<T>>) => {
    return {
        autoAck:  defaultToTrue(newState.autoAck),
        autoReply:  defaultTo(newState.autoReply, false),
        queue:  newState.queue,
        exchanges:  [].concat(newState.exchanges || []),
        prefetch:  newState.prefetch || 0,
        reestablish:  defaultToTrue(newState.reestablish),
        failSpan:  newState.failSpan,
        failThreshold:  newState.failThreshold,
        failTimeout:  newState.failTimeout,
        json:  defaultToTrue(newState.json),
        confirm:  newState.confirm,
        skipSetup:  newState.skipSetup,
        middleware:  newState.middleware || []
    };
};
