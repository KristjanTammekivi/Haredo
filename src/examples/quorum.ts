import { Haredo } from '../haredo';
import { Queue } from '../queue';
import { delay } from '../utils/delay';

const start = async () => {
    const haredo = Haredo({ url: process.env.RABBIT_URL || 'amqp://localhost' });
    await haredo.connect();

    const queue = Queue<{ id: number }>('testQuorumQueue').quorum().deliveryLimit(3);

    await haredo.queue(queue).subscribe(async ({ id }, data) => {
        console.log(new Date(), 'Message received:', id, data.deliveryCount);
        throw new Error('Nacking message');
    });

    let iteration = 1;
    while (true) {
        await haredo.queue(queue).publish({ id: iteration++ });
        await delay(1000);
    }
};

process.nextTick(start);
