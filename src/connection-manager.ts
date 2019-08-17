import { Connection, connect, Options, Channel, ConfirmChannel } from 'amqplib';
import { HaredoClosingError } from './errors';
import { makeEmitter, TypedEventEmitter } from './events';
import { makeLogger } from './loggers';
import { delay, promiseMap } from './utils';
import { Consumer } from './consumer';

const { info, error, debug } = makeLogger('ConnectionManager');

export interface Events {
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
}

export const makeConnectionManager = (connectionOpts: string | Options.Connect, socketOpts: any): ConnectionManager => {
    let connection: Connection;
    let connectionPromise: Promise<Connection>;
    let closing = false;
    const emitter = makeEmitter<Events>();
    let consumers = [] as Consumer[];

    const addConsumer = (consumer: Consumer) => {
        consumers = consumers.concat(consumer);
        consumer.emitter.on('close', () => {
            consumers = consumers.filter(x => x === consumer);
        });
    };

    const closeConsumers = async () => {
        await promiseMap(consumers, async (consumer) => {
            await consumer.close();
        });
    };

    const getConnection = async () => {
        if (closing) {
            const error = new HaredoClosingError();
            emitter.emit('error', error);
            /* istanbul ignore next for some reason throw error seems as uncovered */
            throw error;
        }
        if (!connectionPromise) {
            connectionPromise = loopGetConnection();
        }
        return connectionPromise;
    };

    const loopGetConnection = async () => {
        while (true) {
            if (closing) {
                throw new HaredoClosingError();
            }
            try {
                connection = await Promise.resolve(connect(connectionOpts, socketOpts));
                connection.on('error', /* istanbul ignore next */(err) => {
                    error('connection error', err);
                });
                connection.on('close', async () => {
                    emitter.emit('connectionclose');
                    info('connection closed');
                    connectionPromise = undefined;
                    connection = undefined;
                    if (!closing) {
                        await getConnection();
                    }
                });
                emitter.emit('connected', connection);
                return connection;
            } catch (e) /* istanbul ignore next */ {
                error('failed to connect', e);
                await delay(1000);
            }
        }
    };

    return {
        addConsumer,
        emitter,
        getConnection,
        close: async () => {
            closing = true;
            try {
                await connectionPromise;
            } catch {}
            await closeConsumers();
            await (connection && connection.close());
        },
        getChannel: async () => {
            const connection = await getConnection();
            const channel = await connection.createChannel();
            channel.on('error', (err) => {});
            return channel;
        },
        getConfirmChannel: async () => {
            const connection = await getConnection();
            const channel = await connection.createConfirmChannel();
            channel.on('error', (err) => {});
            return channel;
        }
    };
};
