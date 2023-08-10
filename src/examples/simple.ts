import { Haredo } from '../haredo';
import { delay } from '../utils/delay';

const start = async () => {
    const haredo = Haredo({ url: process.env.RABBIT_URL || 'amqp://localhost' });
    await haredo.connect();

    await haredo.queue<{ id: number }>('testQueue').subscribe(async ({ data }) => {
        console.log(new Date(), 'Message received:', data.id);
    });

    let iteration = 1;
    while (true) {
        await haredo.queue<{ id: number }>('testQueue').publish({ id: iteration++ });
        await delay(1000);
    }
};

process.nextTick(start);
