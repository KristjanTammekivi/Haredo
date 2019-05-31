import { Options, Connection, connect, Channel, ConfirmChannel } from 'amqplib';
import { makeLogger } from './logger';
import { Queue } from './queue';
import { Exchange } from './exchange';
import { ConsumerManager } from './consumer-manager';
import { delay } from './utils';
import { HaredoError, HaredoClosingError } from './errors';
import { EventEmitter } from 'events';
import { TypedEventEmitter } from './events';

const { info, error, debug } = makeLogger('ConnectionManager');

interface Events {
    close: void;
    error: HaredoError;
}

export class ConnectionManager {
    closing = false;
    closed = false;
    private closePromise: Promise<void>;
    connection: Connection;
    connectionPromise: Promise<Connection>;
    connectionOpts: string | Options.Connect;
    consumerManager = new ConsumerManager();
    socketOpts: any;
    private publishChannel: Channel;
    private publishConfirmChannel: ConfirmChannel;
    public emitter = new EventEmitter() as TypedEventEmitter<Events>;
    constructor(opts: string | Options.Connect = 'amqp://localhost:5672', socketOpts: any = {}) {
        this.connectionOpts = opts;
        this.socketOpts = socketOpts;
    }

    async getConnection() {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        if (this.closing) {
            const error = new HaredoClosingError();
            this.emitter.emit('error', error);
            throw error;
        }
        this.connectionPromise = this.loopGetConnection();
        return this.connectionPromise;
    }

    private async loopGetConnection () {
        while (true) {
            try {
                const connection = await Promise.resolve(connect(this.connectionOpts, this.socketOpts));
                connection.on('error', (err) => {
                    error('connection error', err);
                });
                connection.on('close', () => {
                    info('connection closed');
                    this.connectionPromise = undefined;
                    this.connection = undefined;
                    if (!this.closing) {
                        this.getConnection();
                    }
                });
                this.connection = connection;
                return connection;
            } catch (e) {
                error('failed to connect', e);
                await delay(1000);
            }
        }
    }

    async getChannel() {
        const connection = await this.getConnection();
        debug('creating channel');
        const channel = await connection.createChannel();
        // Without this channel errors will crash the application
        channel.on('error', (err) => {
            error('Channel error', err);
        });
        return channel;
    }

    async getConfirmChannel() {
        const connection = await this.getConnection();
        debug('creating confirm channel');
        const channel = await connection.createConfirmChannel();
        channel.on('error', (err) => {
            error('ConfirmChannel error', err);
        });
        return channel;
    }

    async getChannelForPublishing() {
        if (this.publishChannel) {
            return this.publishChannel;
        }
        this.publishChannel = await this.getChannel();
        this.publishChannel.on('close', () => {
            debug('publishchannel was closed');
            this.publishChannel = undefined;
        });
        return this.publishChannel;
    }

    async getConfirmChannelForPublishing() {
        if (this.publishConfirmChannel) {
            return this.publishConfirmChannel;
        }
        this.publishConfirmChannel = await this.getConfirmChannel();
        this.publishConfirmChannel.on('close', () => {
            debug('publishconfirmchannel was closed');
            this.publishConfirmChannel = undefined;
        });
        return this.publishConfirmChannel;
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
        await this.consumerManager.close();
        this.closing = true;
        if (this.connection) {
            await this.connection.close();
        }
        this.closed = true;
        this.emitter.emit('close');
    }
}