import { Connection, connect, Options, Channel, ConfirmChannel } from 'amqplib';
import { HaredoClosingError } from './errors';
import { makeEmitter, TypedEventEmitter } from './events';
import { delay, promiseMap, walkUntilEnd } from './utils';
import { Consumer } from './consumer';
import { StartRpc, startRpc } from './rpc';
import { initialChain } from './haredo';
import { Loggers } from './state';
import { makePublisher, Publisher } from './publisher';

export interface Events {
    connecting: never;
    connectionfail: Error;
    connected: Connection;
    error: Error;
    connectionclose: never;
}

export interface ConnectionManager {
    addConsumer: (consumer: Consumer) => void;
    emitter: TypedEventEmitter<Events>;
    close: () => Promise<void>;
    getConnection(): Promise<Connection>;
    getChannel(): Promise<Channel>;
    getConfirmChannel(): Promise<ConfirmChannel>;
    publisher: Publisher;
    rpc<TReply>(correlationId: string): Promise<{ promise: Promise<TReply>, queue: string }>;
}

export type ConnectionOptions = Options.Connect & {
    /**
     * An array of reconnection delays.
     * For example
     * [1000, 10000, 60000] would mean that after first attempt of connecting
     * there's a delay of 1s, then 10s and all the rest after 60s until a
     * successful connection to RabbitMQ is made
     * @default [1000]
    */
    reconnectDelays?: number[];
};

export const makeConnectionManager = (connectionOpts: string | ConnectionOptions, socketOpts: any, log: Loggers): ConnectionManager => {
    let connection: Connection;
    let connectionPromise: Promise<Connection>;
    let closed = false;
    const emitter = makeEmitter<Events>();
    let consumers = [] as Consumer[];
    let rpcPromise: Promise<StartRpc>;

    const addConsumer = (consumer: Consumer) => {
        consumers = consumers.concat(consumer);
        consumer.emitter.on('close', () => {
            consumers = consumers.filter(x => x !== consumer);
        });
    };

    const closeConsumers = async () => {
        log.info({ component: 'ConnectionManager', msg: 'closing consumers' });
        await promiseMap(consumers, async (consumer) => {
            await consumer.close();
        });
        log.info({ component: 'ConnectionManager', msg: 'done closing consumers' });
    };

    const getConnection = async () => {
        /* istanbul ignore if */
        if (closed) {
            const error = new HaredoClosingError();
            log.error({ component: 'ConnectionManager', msg: 'closed, cannot create a new connection', error });
            emitter.emit('error', error);
            throw error;
        }
        if (!connectionPromise) {
            connectionPromise = loopGetConnection();
        }
        return connectionPromise;
    };

    const cm: Partial<ConnectionManager> = {
        addConsumer,
        emitter,
        getConnection,
        close: async () => {
            log.info({ component: 'ConnectionManager', msg: 'closing...' });
            try {
                await connectionPromise;
            } catch (error) {
                /* istanbul ignore next */
                log.error({ component: 'ConnectionManager', msg: 'getting initial connection failed', error });
            }
            const rpc = await rpcPromise;
            await rpc?.close();
            await closeConsumers();
            closed = true;
            log.info({ component: 'ConnectionManager', msg: 'closing rabbitmq connection' });
            await connection?.close();
            log.info({ component: 'ConnectionManager', msg: 'closed' });
        },
        getChannel: async () => {
            const connection = await getConnection();
            const channel = await connection.createChannel();
            channel.on('error', () => { });
            return channel;
        },
        getConfirmChannel: async () => {
            const connection = await getConnection();
            const channel = await connection.createConfirmChannel();
            channel.on('error', () => { });
            return channel;
        }
    };

    cm.publisher = makePublisher(cm as ConnectionManager, log);

    const rpc = async <TReply>(correlationId: string) => {
        if (!rpcPromise) {
            rpcPromise = startRpc(initialChain({ log, connectionManager: cm as ConnectionManager }), log);
        }
        const rpc = await rpcPromise;
        return rpc.add<TReply>(correlationId);
    };

    const loopGetConnection = async () => {
        log.info({ component: 'ConnectionManager', msg: 'connecting' });
        let reconnectDelays = [1000];
        if (isConnectionOpts(connectionOpts) && connectionOpts.reconnectDelays) {
            reconnectDelays = connectionOpts.reconnectDelays;
        }
        const walker = walkUntilEnd(reconnectDelays);
        while (true) {
            /* istanbul ignore if */
            if (closed) {
                throw new HaredoClosingError();
            }
            try {
                emitter.emit('connecting');
                connection = await connect(connectionOpts, socketOpts);
                connection.on('error', /* istanbul ignore next */(error) => {
                    log.error({ component: 'ConnectionManager', msg: 'connection error', error });
                });
                connection.on('close', async () => {
                    emitter.emit('connectionclose');
                    log.info({ component: 'ConnectionManager', msg: 'connection closed' });
                    connectionPromise = undefined;
                    connection = undefined;
                    if (!closed) {
                        log.info({ component: 'ConnectionManager', msg: 'reopening connection' });
                        await getConnection();
                    }
                });
                emitter.emit('connected', connection);
                log.info({ component: 'ConnectionManager', msg: 'connected' });
                return connection;
            } catch (error) /* istanbul ignore next */ {
                emitter.emit('connectionfail', error);
                log.error({ component: 'ConnectionManager', msg: 'error while connecting', error });
                await delay(walker());
            }
        }
    };

    cm.rpc = rpc;

    return cm as ConnectionManager;
};

const isConnectionOpts = (x: any): x is ConnectionOptions => {
    return typeof x === 'object';
};
