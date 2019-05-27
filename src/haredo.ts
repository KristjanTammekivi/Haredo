import { Options, Connection } from 'amqplib';
import { ConnectionManager } from './connection-manager';
import { Queue } from './queue';
import { HaredoChain } from './haredo-chain';
import { Exchange, ExchangeType, xDelayedTypeStrings } from './exchange';
import { EventEmitter } from 'events';
import { TypedEventEmitter } from './events';
import { MergeTypes } from './utils';

export interface HaredoOptions {
    connection?: Options.Connect | string;
    reconnect?: boolean;
    socketOpts?: any
}

export enum HaredoEvents {
    close = 'close'
}

interface Events {
    [HaredoEvents.close]: never;
}

export class Haredo {
    connectionManager: ConnectionManager;
    closing = false;
    closed = false;
    private connectionPromise: Promise<Connection>
    private closePromise: Promise<void>;
    emitter = new EventEmitter() as TypedEventEmitter<Events>;
    constructor(private opts: HaredoOptions = {}) {
        this.connectionManager = new ConnectionManager(this.opts.connection, this.opts.socketOpts);
    }
    async connect() {
        if (this.connectionPromise) {
            return this.connectionPromise
        }
        this.connectionPromise = this.internalConnect();
        return this.connectionPromise;
    }
    async internalConnect() {
        const connection = await this.connectionManager.getConnection();
        connection.on('close', () => {
            if (this.opts.reconnect) {
                this.connect();
            } else {
                this.emitter.emit(HaredoEvents.close);
            }
        });
        return connection;
    }
    async close() {
        this.closing = true;
        this.closePromise = this.closePromise || this.internalClose();
        return this.closePromise;
    }
    private async internalClose() {
        await this.connectionManager.close();
        this.emitter.emit(HaredoEvents.close);
    }
    queue<T>(queue: Queue<T> | string) {
        return new HaredoChain<T>(this.connectionManager, {})
            .queue(queue);
    }
    exchange<T>(exchange: Exchange<T>): HaredoChain<MergeTypes<T, T>>
    exchange<T>(exchange: string, type?: ExchangeType | xDelayedTypeStrings, pattern?: string): HaredoChain<MergeTypes<T, T>>
    exchange<T>(exchange: Exchange<T>, pattern?: ExchangeType | xDelayedTypeStrings | string): HaredoChain<MergeTypes<T, T>>
    exchange<T>(
        exchange: Exchange<T> | string,
        typeOrPattern: ExchangeType | xDelayedTypeStrings = ExchangeType.Direct,
        pattern: string = '#'
    ) {
        return new HaredoChain<T>(this.connectionManager, {})
            .exchange(exchange as string, typeOrPattern, pattern);
    }

}