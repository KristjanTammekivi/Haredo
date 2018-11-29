import { connect, Connection, Options } from 'amqplib';
import { stringify } from '../../../src/utils';

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

export const checkQueue = async (name: string, opts?: Options.AssertQueue) => {
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

export const listChannels = async () => {
    console.log(await statsInstance.getChannels());
};

export const publishMessage = async (name: string, content: any, opts: Options.Publish) => {
    const channel = await getChannel();
    await channel.sendToQueue(name, Buffer.from(stringify(content)), opts);
    await channel.close();
};

export const checkQueueEmpty = async (name: string) => {
    console.log(await listVhostQueues());
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
