import { haredo } from '../haredo';
import { makeQueue } from '../queue';
import { delay } from 'bluebird';

const main = async () => {
    const chain = haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    const queue = makeQueue<{ test: number, time: number }>('test').expires(2000);
    await chain.queue(queue)
        .subscribe(({ data }) => {
            console.log(data);
        });
    let i = 1;
    while (true) {
        await chain.queue(queue).publish({ test: i, time: Date.now() });
        await delay(500);
        i += 1;
    }
};

process.nextTick(main);
