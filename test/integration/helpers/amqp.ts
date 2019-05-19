import { connect, Connection, Options } from 'amqplib';
import { stringify } from '../../../src/utils';
import { ExchangeType } from '../../../src/exchange';

let connection: Connection;

const RabbitStats = require('rabbitmq-stats');
const statsInstance = RabbitStats('http://localhost:15672', 'guest', 'guest');

export const setup = async () => {
    await createVhost();
    connection = await connect('amqp://guest:guest@localhost:5672/test');
};

export const createVhost = async () => {
    await statsInstance.putVhost('test');
    await statsInstance.setUserPermissions('guest', 'test', {
        vhost: 'test',
        username: 'guest',
        configure: '.*',
        write: '.*',
        read: '.*'
    });
};

export const checkExchange = async (name: string, type: ExchangeType, opts?: Options.AssertExchange) => {
    const channel = await getChannel();
    await channel.checkExchange(name);
    if (opts) {
        await channel.assertExchange(name, type, opts);
    }
    return channel.close();
};

interface GetVhostQueue {
    garbage_collection:
    {
        max_heap_size: number,
        min_bin_vheap_size: number,
        min_heap_size: number,
        fullsweep_after: number,
        minor_gcs: number
    },
    consumer_details: any[],
    incoming: any[],
    deliveries: any[],
    node: string,
    arguments: any,
    exclusive: boolean,
    auto_delete: boolean,
    durable: boolean,
    vhost: string,
    name: string
}


export const getVhostQueue = async (name: string): Promise<GetVhostQueue> => {
    return statsInstance.getVhostQueue('test', name);
};

export const checkQueue = async (name: string) => {
    const channel = await getChannel();
    const stats = await channel.checkQueue(name);
    await channel.close();
    return stats;
};

export const verifyQueue = async (name: string, opts?: Options.AssertQueue) => {
    const channel = await getChannel();
    await channel.checkQueue(name);
    if (opts) {
        await channel.assertQueue(name, opts);
    }
    return channel.close();
};

export const listVhostQueues = async () => {
    const queues = await statsInstance.getVhostQueues('test');
    return queues;
};

export const getChannel = async () => {
    const channel = await connection.createChannel();
    channel.on('error', () => { });
    return channel;
};

export const deleteVhost = async () => {
    await statsInstance.deleteVhost('test');
};

export const publishMessage = async (name: string, content: any, opts: Options.Publish) => {
    const channel = await getChannel();
    await channel.sendToQueue(name, Buffer.from(stringify(content)), opts);
    await channel.close();
};

export const purgeQueue = async (name: string) => {
    const channel = await getChannel();
    const data = await channel.purgeQueue(name);
    await channel.close();
    return data.messageCount;
}

export const getSingleMessage = async (name: string) => {
    const channel = await getChannel();
    const message = await channel.get(name, { noAck: true })
    await channel.close();
    if (message === false) {
        throw new Error(`No message in queue ${name}`);
    }
    return {
        content: message.content.toString(),
        fields: message.fields,
        properties: message.properties
    };
};

export const teardown = async () => {
    await connection.close();
    await deleteVhost();
};
