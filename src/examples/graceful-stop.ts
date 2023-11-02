import { Haredo } from '../haredo';
import { delay } from '../utils/delay';

const start = async () => {
    const haredo = Haredo({ url: process.env.RABBIT_URL || 'amqp://localhost' });
    await haredo.connect();

    await haredo.queue<{ id: number }>('testQueue').subscribe(async (data) => {
        console.log(new Date(), 'Message received:', data.id);
        await delay(5000);
        console.log(new Date(), 'Message processed:', data.id);
    });

    let iteration = 1;
    await haredo.queue<{ id: number }>('testQueue').publish({ id: iteration++ });
    await delay(500);
    console.log(new Date(), 'Stopping...');
    await haredo.close();
    console.log(new Date(), 'Stopped');
};

process.nextTick(start);
