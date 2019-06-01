import { Options, Connection } from 'amqplib';
import { ConnectionManager } from './connection-manager';
import { Queue } from './queue';
import { HaredoChain } from './haredo-chain';
import { Exchange, ExchangeType, xDelayedTypeStrings, ExchangeOptions } from './exchange';
import { EventEmitter } from 'events';
import { TypedEventEmitter } from './events';
import { makeLogger } from './logger';
import { HaredoError } from './errors';

const { info } = makeLogger('Haredo');

export interface HaredoOptions {
    connection?: Options.Connect | string;
    socketOpts?: any;
}

interface Events {
    close: never;
    connected: never;
    error: HaredoError;
}

export class Haredo {
    connectionManager: ConnectionManager;
    closing = false;
    closed = false;
    private closePromise: Promise<void>;
    emitter = new EventEmitter() as TypedEventEmitter<Events>;
    constructor(private opts: HaredoOptions) {
        this.connectionManager = new ConnectionManager(this.opts.connection, this.opts.socketOpts);
        this.connectionManager.emitter.on('error', /* istanbul ignore next */ (err) => {
            this.emitter.emit('error', err);
        });
    }
    async connect(): Promise<Connection> {
        const connection = await this.connectionManager.getConnection();
        info('connected');
        this.emitter.emit('connected');
        return connection;
    }
    async close() {
        info('Closing');
        this.closing = true;
        this.closePromise = this.closePromise || this.internalClose();
        return this.closePromise;
    }
    private async internalClose() {
        await this.connectionManager.close();
        info('Closed');
        this.emitter.emit('close');
    }
    /**
     * Start the chain off with a queue.
     */
    queue<T>(queue: Queue<T> | string) {
        return new HaredoChain<T>(this.connectionManager, {})
            .queue(queue);
    }
    /**
     * Start the chain off with a exchange. When pattern is omitted it
     * defaults to '#'
     *
     * '#' - wildcard for zero or more dot-limited words
     *
     * '*' - wildcard for a single word
     */
    exchange<T>(exchange: Exchange<T>): HaredoChain<T>;
    exchange<T>(exchange: Exchange<T>, pattern?: string): HaredoChain<T>;
    exchange<T>(
        exchange: string,
        type?: ExchangeType | xDelayedTypeStrings,
        pattern?: string,
        opts?: Partial<ExchangeOptions>
    ): HaredoChain<T>;
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
