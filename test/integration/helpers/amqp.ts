import { connect, Connection, Options } from 'amqplib';
import { ExchangeType } from '../../../src/exchange';
import { RabbitAdmin } from 'rabbitmq-admin';
import { config } from 'dotenv';

config();

const rabbitHost = process.env.RABBIT_HOST || 'localhost';
const rabbitPort = process.env.RABBIT_PORT || '5672';
const rabbitUser = process.env.RABBIT_USER || 'guest';
const rabbitPass = process.env.RABBIT_PASS || 'guest';

export const rabbitUrl = `amqp://${ rabbitUser }:${ rabbitPass }@${ rabbitHost }:${ rabbitPort }/test`;

let connection: Connection;

const rabbitAdmin = RabbitAdmin();

export const setup = async () => {
    await createVhost();
    connection = await connect(rabbitUrl);
};

export const createVhost = async () => {
    await rabbitAdmin.createVhost('test');
    await rabbitAdmin.setUserPermissions('test', 'guest', {
        configure: '.*',
        write: '.*',
        read: '.*'
    });
};

export const getConsumers = async () => rabbitAdmin.getConsumers('test');

export const checkExchange = async (name: string, type: ExchangeType, opts?: Options.AssertExchange) => {
    const channel = await getChannel();
    await channel.checkExchange(name);
    if (opts) {
        await channel.assertExchange(name, type, opts);
    }
    return channel.close();
};

export const getVhostQueue = async (name: string) => {
    return rabbitAdmin.getVhostQueue('test', name);
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
    return rabbitAdmin.getVhostQueues('test');
};

export const getChannel = async () => {
    const channel = await connection.createChannel();
    channel.on('error', () => { });
    return channel;
};

export const deleteVhost = async () => {
    await rabbitAdmin.deleteVhost('test');
};

export const publishMessage = async (name: string, content: any, opts: Options.Publish) => {
    const channel = await getChannel();
    await channel.sendToQueue(name, Buffer.from(JSON.stringify(content)), opts);
    await channel.close();
};

export const purgeQueue = async (name: string) => {
    const channel = await getChannel();
    const data = await channel.purgeQueue(name);
    await channel.close();
    return data.messageCount;
};

export const getSingleMessage = async (name: string) => {
    const channel = await getChannel();
    const message = await channel.get(name, { noAck: true });
    await channel.close();
    if (message === false) {
        throw new Error(`No message in queue ${ name }`);
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
