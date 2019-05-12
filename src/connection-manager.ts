import { Options, Connection, connect } from 'amqplib';
import * as Bluebird from 'bluebird';
import { makeDebug } from './logger';

const log = makeDebug('connectionmanager:');

export class ConnectionManager {
    closing = false;
    closed = false;
    connection: Connection;
    connectionPromise: Bluebird<Connection>;
    connectionOpts: string | Options.Connect;
    socketOpts: any;
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
        await Bluebird.delay(500);
        return this.getConnection();
    }

    async getConnection() {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        this.connection = null;
        log('connecting');
        this.connectionPromise = connect(this.connectionOpts, this.socketOpts);
        this.connection = await this.connectionPromise;
        log('connection established');
        this.connection.on('close', this.reconnect);
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

    close() {
        log('closing');
        this.closing = true;
    }
}