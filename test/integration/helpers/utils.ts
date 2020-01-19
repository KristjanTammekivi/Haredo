import { EventEmitter } from 'events';
import { getChannel } from './amqp';
import { LogItem } from '../../../src/haredo';

export const eventToPromise = (emitter: EventEmitter, event: string) => {
    return new Promise((resolve) => {
        emitter.once(event, () => {
            resolve();
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

export const debugLogger = (log: LogItem) => console.log(`${log.timestamp.toISOString()} ${log.level} ${log.component}: ${ formatMessage(log.msg)}`);
const formatMessage = (msg: any[]) => {
    return msg
        .map((x) => {
            if (x instanceof Error) {
                // tslint:disable-next-line: prefer-template
                return x.message + '\n' + x.stack;
            }
            if (typeof x === 'object') {
                return JSON.stringify('x');
            }
            return x.toString();
        })
        .join(', ');
};
