import { AMQPChannel, AMQPQueue } from '@cloudamqp/amqp-client';

export const sendToQueue = async (channel: AMQPChannel, name: string, message: any) => {
    const queue = new AMQPQueue(channel, name);
    console.log('puuublish', channel);
    await queue.publish(message);
};
