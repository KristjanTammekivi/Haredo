import { Options, Connection, connect, Channel } from 'amqplib';
import { Queue } from './queue';
import { Exchange } from './exchange';
import { HaredoChain } from './haredo-chain';
import { EventEmitter } from 'events';

import * as Bluebird from 'bluebird';
import { UnpackQueueArgument, UnpackExchangeArgument } from './utils';

export interface IHaredoOptions {
    autoAck?: boolean;
    connectionOptions: string | Options.Connect;
    socketOpts: any;
    forceAssert: boolean;
}

const DEFAULT_OPTIONS: IHaredoOptions = {
    autoAck: true,
    connectionOptions: 'amqp://localhost:5672/',
    socketOpts: {},
    forceAssert: false
}

export class Haredo extends EventEmitter {
    public connection: Connection;
    private connectionOptions: string | Options.Connect;
    private socketOpts: any;
    public autoAck: boolean;
    public forceAssert: boolean;
    private channels: Channel[] = [];
    public closing: boolean = false;
    private connectionPromise: Bluebird<Connection>;

    constructor(opts: Partial<IHaredoOptions>) {
        super();
        const defaultedOpts: IHaredoOptions = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.connectionOptions = defaultedOpts.connectionOptions;
        this.socketOpts = defaultedOpts.socketOpts;
        this.autoAck = defaultedOpts.autoAck;
        this.forceAssert = defaultedOpts.forceAssert;
    }

    async connect() {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        this.connectionPromise = connect(this.connectionOptions, this.socketOpts);
        this.connection = await this.connectionPromise;
        this.connectionPromise = undefined;

        this.connection.once('close', () => {
            console.log('connection close');
        });

        return this.connection;
    }

    async getChannel() {
        const channel = await this.connection.createChannel();
        // Without this channel errors will exit the program
        channel.on('error', () => { });
        channel.on('close', () => {
            this.channels = this.channels.filter((c) => {
                return channel !== c;
            });
        });
        this.channels.push(channel);
        return channel;
    }

    queue<T extends Queue>(queue: T) {
        return new HaredoChain<UnpackQueueArgument<T>>(this, { queue });
    }

    exchange<T extends Exchange>(exchange: T): HaredoChain<UnpackExchangeArgument<T>>;
    exchange<T extends Exchange>(exchange: T, pattern: string): HaredoChain<UnpackExchangeArgument<T>>;
    exchange<T extends Exchange>(exchange: T, pattern?: string) {
        return new HaredoChain<UnpackExchangeArgument<T>>(this, { exchanges: [{ exchange, pattern }] });
    }
}
