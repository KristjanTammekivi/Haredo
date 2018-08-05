import { Options, Connection, connect, Channel } from 'amqplib';
import { Queue } from './queue';
import { Exchange } from './exchange';
import { HaredoChain } from './haredo-chain';
import { EventEmitter } from 'events';

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

    constructor(opts: Partial<IHaredoOptions>) {
        super();
        const defaultedOpts: IHaredoOptions = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.connectionOptions = defaultedOpts.connectionOptions;
        this.socketOpts = defaultedOpts.socketOpts;
        this.autoAck = defaultedOpts.autoAck;
        this.forceAssert = defaultedOpts.forceAssert;
    }

    async connect() {
        this.connection = await connect(this.connectionOptions, this.socketOpts);

        this.connection.once('close', () => {
            console.log('connection close');
        });
    }

    async getChannel() {
        const channel = await this.connection.createChannel();
        // Without this channel errors will exit the program
        channel.on('error', () => {});
        return channel;
    }

    queue(queue: Queue) {
        return new HaredoChain(this, { queue });
    }

    exchange(exchange: Exchange): HaredoChain;
    exchange(exchange: Exchange, pattern: string): HaredoChain;
    exchange(exchange: Exchange, pattern?: string) {
        return new HaredoChain(this, { exchanges: [{ exchange, pattern }]});
    }
}
