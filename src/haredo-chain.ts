import { Haredo } from './haredo';
import { Queue } from './queue';
import { Exchange } from './exchange';
import { MergeTypes } from './utils';
import { BadArgumentsError } from './errors';
import { makeDebug } from './logger';
import { ConnectionManager } from './connection-manager';

const log = makeDebug('connectionmanager:');

interface AddExchange {
    exchange: Exchange;
    pattern: string;
}

interface HaredoChainState {
    isSetup: boolean;
    prefetch: number;
    queue: Queue;
    exchanges: AddExchange[];
    failThreshold: number;
    failSpan: number;
    failTimeout: number;
    reestablish: boolean;
    json: boolean;
}

export class HaredoChain<T = unknown> {
    state: Partial<HaredoChainState> = {};
    constructor(public connectionManager: ConnectionManager, state: Partial<HaredoChainState>) {
        this.state.queue = state.queue;
        this.state.exchanges = [].concat(state.exchanges || []);
        this.state.prefetch = state.prefetch || 0;
        this.state.isSetup = !!state.isSetup;
        this.state.reestablish = !!state.reestablish;
        this.state.failSpan = state.failSpan;
        this.state.failThreshold = state.failThreshold;
        this.state.failTimeout = state.failTimeout;
        this.state.json = !!state.json || false;
    }
    private clone<U = T>(state: Partial<HaredoChainState>) {
        return new HaredoChain<U>(this.connectionManager, Object.assign({}, this.state, state))
    }
    queue<U>(queue: Queue<U>) {
        if (this.state.queue) {
            throw new BadArgumentsError(`Chain can only contain one queue`);
        }
        return this.clone<MergeTypes<T, U>>({
            queue,
            isSetup: false,
        });
    }
    exchange<U>(exchange: Exchange<U>): HaredoChain<MergeTypes<T, U>>
    exchange<U>(exchange: Exchange<U>, pattern: string): HaredoChain<MergeTypes<T, U>>
    exchange<U>(exchange: Exchange<U>, pattern: string = '#') {
        return this.clone<MergeTypes<T, U>>({
            isSetup: false,
            exchanges: this.state.exchanges.concat({
                exchange,
                pattern
            })
        })
    }
    prefetch(prefetch: number) {
        return this.clone({ prefetch });
    }
    json() {
        return this.clone({ json: true });
    }
    reestablish() {
        return this.clone({ reestablish: true });
    }
    failThreshold(failThreshold: number) {
        return this.clone({ failThreshold });
    }
    failSpan(failSpan: number) {
        return this.clone({ failSpan });
    }
    failTimeout(failTimeout: number) {
        return this.clone({ failTimeout });
    }
    async subscribe() {
        if (!this.state.isSetup) {
            await this.setup();
        }
    }
    async setup() {
        if (this.state.isSetup) {
            return;
        }
        // TODO: put this into a promise, don't let 2 calls
        const channel = await this.connectionManager.getChannel();
        if (this.state.queue) {
            log(`Asserting ${this.state.queue}`);
            const { name, opts } = this.state.queue;
            await channel.assertQueue(name, opts);
            log(`Done asserting ${this.state.queue}`);
        }
        for (const exchangery of this.state.exchanges) {
            log(`Asserting ${exchangery.exchange}`);
            const { name, type, opts } = exchangery.exchange;
            await channel.assertExchange(name, type, opts);
            if (this.state.queue) {
                const queue = this.state.queue;
                log(`Binding ${queue} to ${exchangery.exchange} using pattern ${exchangery.pattern}`);
                await channel.bindQueue(queue.name, name, exchangery.pattern);
            }
        }
        log('Setup done');
        this.state.isSetup = true;
    }
}