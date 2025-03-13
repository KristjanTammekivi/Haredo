import { Haredo } from '../haredo';
import { Middleware } from '../utils/apply-middleware';
import { delay } from '../utils/delay';

interface Message {
    id: number;
}

const log = (...messages: any[]) => console.log(new Date(), ...messages);

const metrics: Middleware<Message> = async (_message, next) => {
    const start = Date.now();
    await next();
    log('Message processed in', Date.now() - start, 'ms');
};

const dropEven: Middleware<Message> = async ({ data, ack }) => {
    if (data.id % 2 === 0) {
        log('Message dropped:', data.id);
        await ack();
    } else {
        log('Message passed:', data.id);
    }
};

const start = async () => {
    const haredo = Haredo({ url: process.env.RABBIT_URL || 'amqp://localhost' });
    await haredo.connect();

    await haredo
        .queue<Message>('testQueue')
        .use(dropEven)
        .use(metrics)
        .subscribe(async (data) => {
            log('Message received:', data.id);
            await delay(10);
        });

    let iteration = 1;
    while (true) {
        await haredo.queue<{ id: number }>('testQueue').publish({ id: iteration++ });
        await delay(1000);
    }
};

process.nextTick(start);
