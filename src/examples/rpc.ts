import { e, q } from '..';
import { haredo } from '../haredo';
import { delay } from '../utils';

export const main = async () => {
    const rabbit = haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    const queue = q<number[], number>('sum');

    await rabbit
        .queue(queue)
        .autoReply()
        .subscribe(({ data }) => {
            return data.reduce((acc, item) => acc + item, 0);
        });

    while (true) {
        const numbers = [randomBetween(1, 100), randomBetween(1, 100), randomBetween(1, 100)];
        console.log('Asking for sum of', numbers);
        const result = await rabbit.queue(queue).rpc(numbers);
        console.log('Result is', result);
        await delay(1000);
    }
};

const randomBetween = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

process.nextTick(main);
