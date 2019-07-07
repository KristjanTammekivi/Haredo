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
        this.connectionManager.emitter.on('connected', () => {
            info('connected');
            this.emitter.emit('connected');
        });
    }
    /**
     * Start up the connection manager
     */
    async connect(): Promise<Connection> {
        return this.connectionManager.getConnection();
    }
    /**
     * Safely cancel all consumers, wait for messages to be handled and then
     * close the connection
     */
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
     * Add a queue to the chain
     *
     * @param queue instance of Queue
     */
    queue<T>(queue: Queue<T>): HaredoChain<T>;
    /**
     * Add a queue to the chain
     *
     * @param queueName name of the queue
     * @param opts options that will be passed to amqplib
     * [amqplib#assertQueue](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue)
     */
    queue<T>(queueName: string, opts?: Partial<Options.AssertQueue>): HaredoChain<T>;
    queue<T>(queue: Queue<T> | string, opts?: Partial<Options.AssertQueue>) {
        return new HaredoChain<T>(this.connectionManager, {})
            .queue(queue as string, opts);
    }
    /**
     * Add an exchange to the chain. Pattern defaults to '#'
     */
    exchange<T>(exchange: Exchange<T>): HaredoChain<T>;
    /**
     * Add an exchange to the chain.
     *
     * '*' means a single word
     *
     * '#' in routing keys means zero or more period separated words
     */
    exchange<T>(exchange: Exchange<T>, pattern?: string): HaredoChain<T>;
    /**
     * Add an exchange to the chain.
     *
     * @param exchange name of the exchange
     * @param type exchange type, defaults to Direct
     * @param pattern binding pattern for the exchange (to bind to a queue)
     * @param opts exchange options that will be passed to amqplib while asserting
     * [amqplib#assertExchange](https://www.squaremobius.net/amqp.node/channel_api.html#channel_assertExchange)
     */
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
