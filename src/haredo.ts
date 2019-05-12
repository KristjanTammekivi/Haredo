import { Options, Connection } from 'amqplib';
import { ConnectionManager } from './connection-manager';
import { Queue } from './queue';
import { HaredoChain } from './haredo-chain';
import { Exchange } from './exchange';

export interface HaredoOpts {
    connection?: Options.Connect | string;
    socketOpts?: any
}

export class Haredo {
    connectionManager: ConnectionManager;
    closing = false;
    closed = false;
    constructor(private opts: HaredoOpts = {}) {
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
        // TODO: implement
    }
    queue<T>(queue: Queue<T>) {
        return new HaredoChain<T>(this.connectionManager, {})
            .queue(queue);
    }
    exchange<T>(exchange: Exchange<T>) {
        return new HaredoChain<T>(this.connectionManager, {})
            .exchange(exchange);
    }
    async assertQueue(queue: Queue) {
        const channel = await this.connectionManager.getChannel();
        await channel.assertQueue(queue.name, queue.opts);
        await channel.close();
    }
    async assertExchange(exchange: Exchange) {
        const channel = await this.connectionManager.getChannel();
        await channel.assertExchange(exchange.name, exchange.type, exchange.opts);
        await channel.close();
    }
}