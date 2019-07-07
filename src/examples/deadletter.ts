import { Queue } from '../queue';
import { Haredo } from '../haredo';
import { delay } from '../utils';
import { Exchange } from '../exchange';

export const main = async () => {
    console.log('starting example');
    const haredo = new Haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    const dlx = new Exchange('dlxexampledeadexchange', 'fanout');
    const dlq = new Queue('dlxexampledeadqueue');
    const mainQueue = new Queue('dlxexample').dead(dlx);
    await haredo.queue(dlq)
        .exchange(dlx)
        .subscribe((msg) => {
            console.log('Dead lettered message found', msg);
        });
    await haredo.queue(mainQueue)
        .subscribe((data, message) => {
            message.nack(false);
        });
    let i = 0;
    while (true) {
        await haredo.queue(mainQueue).skipSetup().publish(`Message #${ i }`);
        await delay(1000);
        i += 1;
    }
};

process.nextTick(() => main());
