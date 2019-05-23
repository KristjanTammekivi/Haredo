import { Options, Connection } from 'amqplib';
import { ConnectionManager } from './connection-manager';
import { Queue } from './queue';
import { HaredoChain } from './haredo-chain';
import { Exchange } from './exchange';

export interface HaredoOptions {
    connection?: Options.Connect | string;
    socketOpts?: any
}

export class Haredo {
    connectionManager: ConnectionManager;
    closing = false;
    closed = false;
    constructor(private opts: HaredoOptions = {}) {
        this.connectionManager = new ConnectionManager(this.opts.connection, this.opts.socketOpts);
    }
    async connect() {
        const connection = await this.connectionManager.getConnection();
        connection.on('close', () => this.connect);
    }
    async close() {
        if (this.closed) {
            return;
        }
        this.closing = true;
        await this.connectionManager.close();
        // TODO: implement
    }
    queue<T>(queue: Queue<T> | string) {
        return new HaredoChain<T>(this.connectionManager, {})
            .queue(queue);
    }
    exchange<T>(exchange: Exchange<T>) {
        return new HaredoChain<T>(this.connectionManager, {})
            .exchange(exchange);
    }

}