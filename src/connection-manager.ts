import { Options, Connection, connect } from 'amqplib';
import { makeDebug } from './logger';
import { Queue } from './queue';
import { Exchange } from './exchange';
import { ConsumerManager } from './consumer-manager';
import { delay } from './utils';

const log = makeDebug('connectionmanager:');

export class ConnectionManager {
    closing = false;
    closed = false;
    private closePromise: Promise<void>;
    connection: Connection;
    connectionPromise: Promise<Connection>;
    connectionOpts: string | Options.Connect;
    consumerManager = new ConsumerManager();
    socketOpts: any;
    scopedQueues = [] as string[];
    scopedExchanges = [] as string[];
    constructor(opts: string | Options.Connect = 'amqp://localhost:5672', socketOpts: any = {}) {
        this.connectionOpts = opts;
        this.socketOpts = socketOpts;
    }

    async reconnect() {
        if (this.closing) {
            log('channel closed, not reconnecting');
            return;
        }
        this.connection = null;
        this.connectionPromise = null;
        log('channel closed, reconnecting');
        await delay(500);
        return this.getConnection();
    }

    async getConnection() {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        this.connection = null;
        log('connecting');
        this.connectionPromise = Promise.resolve(connect(this.connectionOpts, this.socketOpts));
        this.connection = await this.connectionPromise;
        log('connection established');
        this.connection.on('close', () => this.reconnect());
        return this.connection;
    }

    async getChannel() {
        if (!this.connection) {
            await this.connectionPromise;
        }
        log('creating channel');
        const channel = await this.connection.createChannel();
        // Without this channel errors will crash the application
        channel.on('error', () => { });
        return channel;
    }

    async getConfirmChannel() {
        if (!this.connection) {
            await this.connectionPromise;
        }
        log('creating confirm channel');
        const channel = await this.connection.createConfirmChannel();
        channel.on('error', () => { });
        return channel;
    }

    async assertQueue(queue: Queue) {
        const channel = await this.getChannel();
        const reply = await channel.assertQueue(queue.name, queue.opts);
        queue.name = reply.queue;
        await channel.close();
        return reply;
    }

    async assertExchange(exchange: Exchange) {
        const channel = await this.getChannel();
        const reply = await channel.assertExchange(exchange.name, exchange.type, exchange.opts);
        await channel.close();
        return reply;
    }

    async bindExchange(source: Exchange, destination: Exchange, pattern: string, args?: any) {
        const channel = await this.getChannel();
        await Promise.all([
            this.assertExchange(source),
            this.assertExchange(destination)
        ]);
        const reply = await channel.bindExchange(source.name, destination.name, pattern, args);
        await channel.close();
        return reply;
    }

    async bindQueue(exchange: Exchange, queue: Queue, pattern: string, args?: any) {
        const channel = await this.getChannel();
        await Promise.all([
            this.assertQueue(queue),
            this.assertExchange(exchange)
        ]);
        const reply = await channel.bindQueue(queue.name, exchange.name, pattern, args);
        await channel.close();
        return reply;
    }

    async close() {
        this.closePromise = this.closePromise || this.internalClose();
        return this.closePromise;
    }

    private async internalClose() {
        log('closing');
        await this.consumerManager.close();
        this.closing = true;
        if (this.connection) {
            await this.connection.close();
        }
        this.closed = true;
    }
}