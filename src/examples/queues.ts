import { Queue } from '../queue';
import { Haredo } from '../haredo';
import { delay } from '../utils';

export const main = async () => {
    console.log('starting example');
    const haredo = new Haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    const queue = new Queue<{ test: number, time: number }>('test').expires(2000);
    await haredo
        .queue(queue)
        .prefetch(2)
        .subscribe((message) => {
            console.log(`+${ new Date().getTime() - message.time }ms`, message);
        });
    let i = 0;
    while (true) {
        await haredo.queue(queue)
            .skipSetup()
            .publish({
                test: i,
                time: new Date().getTime()
            });
        i += 1;
        await delay(2000);
    }
};

process.nextTick(() => main());
