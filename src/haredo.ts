import { Options, Connection } from 'amqplib';
import { ConnectionManager } from './connection-manager';
import { Queue } from './queue';
import { HaredoChain } from './haredo-chain';
import { Exchange, ExchangeType, xDelayedTypeStrings, ExchangeOptions } from './exchange';
import { EventEmitter } from 'events';
import { TypedEventEmitter } from './events';
import { makeDebug } from './logger';
import { delay } from './utils';

const log = makeDebug('haredo')

export interface HaredoOptions {
    connection?: Options.Connect | string;
    reconnect?: boolean;
    socketOpts?: any
}

interface Events {
    close: never;
    connected: never;
}

export class Haredo {
    connectionManager: ConnectionManager;
    closing = false;
    closed = false;
    private closePromise: Promise<void>;
    emitter = new EventEmitter() as TypedEventEmitter<Events>;
    constructor(private opts: HaredoOptions = {}) {
        this.connectionManager = new ConnectionManager(this.opts.connection, this.opts.socketOpts);
    }
    async connect(): Promise<Connection> {
        const connection = await this.connectionManager.getConnection();
        this.emitter.emit('connected');
        return connection;
    }
    async close() {
        this.closing = true;
        this.closePromise = this.closePromise || this.internalClose();
        return this.closePromise;
    }
    private async internalClose() {
        await this.connectionManager.close();
        this.emitter.emit('close');
    }
    queue<T>(queue: Queue<T> | string) {
        return new HaredoChain<T>(this.connectionManager, {})
            .queue(queue);
    }
    exchange<T>(exchange: Exchange<T>): HaredoChain<T>
    exchange<T>(exchange: Exchange<T>, pattern?: string): HaredoChain<T>
    exchange<T>(exchange: string, type?: ExchangeType | xDelayedTypeStrings, pattern?: string, opts?: Partial<ExchangeOptions>): HaredoChain<T>
    exchange<T>(
        exchange: Exchange<T> | string,
        typeOrPattern: ExchangeType | xDelayedTypeStrings = ExchangeType.Direct,
        pattern: string = '#',
        opts?: Partial<ExchangeOptions>
    ) {
        return new HaredoChain<T>(this.connectionManager, {})
            .exchange(exchange as string, typeOrPattern, pattern, opts);
    }

}