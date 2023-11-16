import { Exchange } from '../exchange';
import { Haredo } from '../haredo';
import { Queue } from '../queue';
import { delay } from '../utils/delay';

const start = async () => {
    const haredo = Haredo({ url: process.env.RABBIT_URL || 'amqp://localhost' });
    await haredo.connect();

    const deadLetterExchange = Exchange('dead-letter-exchange', 'topic');

    await haredo
        .queue<{ id: number }>(Queue('dlq').autoDelete())
        .bindExchange(deadLetterExchange, '#')
        .subscribe(async ({ id }) => {
            console.log(new Date(), 'Dead lettered message received:', id);
        });

    const queue = Queue('testQueue').dead(deadLetterExchange).autoDelete();

    await haredo.queue<{ id: number }>(queue).subscribe(async ({ id }, { nack }) => {
        if (id % 2) {
            return nack(false);
        }
        console.log(new Date(), 'Message received:', id);
    });

    let iteration = 1;
    while (true) {
        await haredo.queue<{ id: number }>(queue).publish({ id: iteration++ });
        await delay(1000);
    }
};

process.nextTick(start);
