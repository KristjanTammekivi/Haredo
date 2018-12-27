import { Options, Connection, connect } from 'amqplib';
import { Queue } from './queue';
import { Exchange } from './exchange';
import { HaredoChain } from './haredo-chain';

import * as Bluebird from 'bluebird';
import { UnpackQueueArgument, UnpackExchangeArgument } from './utils';
import { TypedEventEmitter } from './events';
import { EventEmitter } from 'events';
import { ConsumerManager } from './consumer-manager';
import { Consumer } from './consumer';
import { HaredoClosedError } from './errors';

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

interface Events {
    closing: void;
}

export class Haredo {
    private connection: Connection;
    private connectionOptions: string | Options.Connect;
    private socketOpts: any;
    public autoAck: boolean;
    public forceAssert: boolean;
    public closing: boolean = false;
    private closingPromise: Bluebird<void>;
    private connectionPromise: Bluebird<Connection>;

    private consumerManager = new ConsumerManager();

    public emitter: TypedEventEmitter<Events> = new EventEmitter() as TypedEventEmitter<Events>

    constructor(opts: Partial<IHaredoOptions>) {
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

        return this.connection;
    }

    async close(force: boolean = false) {
        if (this.closing) {
            return this.closingPromise;
        }
        this.closing = true;
        if (this.consumerManager.length) {
            await this.consumerManager.drain();
        }
        this.closingPromise = this.connection.close();
        return this.closingPromise;
    }

    async getChannel() {
        if (this.closing) {
            throw new HaredoClosedError();
        }
        const channel = await this.connection.createChannel();
        // Without this channel errors will exit the program
        channel.on('error', () => { });
        return channel;
    }

    addConsumer(consumer: Consumer) {
        this.consumerManager.add(consumer);
    }

    queue<T extends Queue>(queue: T) {
        return new HaredoChain<UnpackQueueArgument<T>>(this, { queue });
    }

    json(useJson = true) {
        return new HaredoChain(this, { json: useJson });
    }

    exchange<T extends Exchange>(exchange: T): HaredoChain<UnpackExchangeArgument<T>>;
    exchange<T extends Exchange>(exchange: T, pattern: string): HaredoChain<UnpackExchangeArgument<T>>;
    exchange<T extends Exchange>(exchange: T, pattern?: string) {
        return new HaredoChain<UnpackExchangeArgument<T>>(this, { exchanges: [{ exchange, pattern }] });
    }
}
