import { q, haredo, Middleware } from '..';
import { delay } from '../utils';

export const main = async () => {
    const rabbit = haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    const queue = q<number, number>('factorial');

    await rabbit
        .queue(queue)
        .autoReply()
        .use(logMessage)
        .use(logReply)
        .subscribe(({ data }) => {
            return factorial(data);
        });

    while (true) {
        await rabbit.queue(queue).rpc(randomBetween(1, 30), { appId: 'Middleware-example' });
        await delay(1000);
    }
};

const logMessage: Middleware = ({ appId }) => {
    console.log('Received a message from', appId);
    // next will be called automatically if it's not done from inside the middleware
    // and middleware doesn't ack/nack the message`
};

const logReply: Middleware = async ({ queue, getReply, data }, next) => {
    const start = Date.now();
    await next();
    console.log(queue, data, 'response', getReply(), 'took', `${ Date.now() - start }ms`);
};

const randomBetween = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const factorial = (num: number): number => {
    if (num < 0) {
        return -1;
    }
    if (num === 0) {
        return 1;
    }
    return num * factorial(num - 1);
};

process.nextTick(main);
