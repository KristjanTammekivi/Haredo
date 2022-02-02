import { EventEmitter } from 'events';
import { getChannel } from './amqp';

export const eventToPromise = (emitter: EventEmitter, event: string) => {
    return new Promise((resolve) => {
        emitter.once(event, () => {
            resolve(null);
        });
    });
};

export const isConsumerClosed = async (queue: string) => {
    const channel = await getChannel();
    try {
        await channel.consume(queue, () => { }, { exclusive: true });
        await channel.close();
    } catch (e) {
        if (e.message.includes('exclusive')) {
            return false;
        }
        throw e;
    }
    return true;
};
