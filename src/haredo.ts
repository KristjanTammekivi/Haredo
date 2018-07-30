import { Options, Connection, connect } from 'amqplib';
import { Queue } from './queue';
import { Exchange } from './exchange';
import { HaredoChain } from './haredo-chain';
import { EventEmitter } from 'events';

export interface IHaredoOptions {
    autoAck?: boolean;
    connectionOptions: string | Options.Connect;
    socketOpts: any;
}

const DEFAULT_OPTIONS: IHaredoOptions = {
    autoAck: true,
    connectionOptions: 'amqp://localhost:5672/',
    socketOpts: {}
}

export class Haredo extends EventEmitter {
    public connection: Connection;
    private connectionOptions: string | Options.Connect;
    private socketOpts: any;
    public autoAck: boolean;

    constructor(opts: Partial<IHaredoOptions>) {
        super();
        const defaultedOpts: IHaredoOptions = Object.assign({}, DEFAULT_OPTIONS, opts);
        this.connectionOptions = defaultedOpts.connectionOptions;
        this.socketOpts = defaultedOpts.socketOpts;
        this.autoAck = defaultedOpts.autoAck;
    }

    async connect() {
        this.connection = await connect(this.connectionOptions, this.socketOpts);
    }

    async getChannel() {
        const channel = await this.connection.createChannel();
        return channel;
    }

    queue(queue: Queue) {
        return new HaredoChain(this, { queue });
    }

    exchange(exchange: Exchange, pattern: string) {
        return new HaredoChain(this, { exchanges: [{ exchange, pattern }]});
    }
}
