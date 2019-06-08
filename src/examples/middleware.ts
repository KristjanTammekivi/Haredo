import { Queue } from '../queue';
import { Haredo } from '../haredo';
import { delay } from '../utils';

export const main = async () => {
    console.log('starting example');
    const haredo = new Haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    await haredo.connect();
    const queue = new Queue<{ test: number }>('test').expires(2000);
    await haredo
        .queue(queue)
        .prefetch(2)
        .use(async (msg, next) => {
            const start = Date.now();
            await next();
            console.log(`Message ${ msg.data.test } was ${ msg.isAcked ? 'acked' : 'nacked' } in ${ Date.now() - start }ms`);
        })
        .subscribe(async (data, message) => {
            await delay(50 * Math.random());
            if (Math.random() > 0.5) {
                message.nack(false);
            } else {
                message.ack();
            }
        });
    let i = 0;
    while (true) {
        await haredo.queue(queue)
            .skipSetup()
            .publish({
                test: i
            });
        i += 1;
        await delay(2000);
    }
};

process.nextTick(() => main());
