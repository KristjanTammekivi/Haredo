import 'source-map-support/register';
import { Haredo } from '../haredo';
import { Queue } from '../queue';
import { HaredoMessage } from '../message';

const haredo = new Haredo({ connectionOptions: 'amqp://guest:guest@localhost:5672/', autoAck: true });
(async () => {
    await haredo.connect();

    const queue = new Queue('test');

    const chain = haredo.queue(queue);

    chain.prefetch(1).subscribe(async (message: HaredoMessage) => {
        console.log('Received message', message.data);
        await delay(1000);
        console.log('Acking message', message.data);
    });

    chain.publish({ test: 'Hello, world 1' });
    chain.publish({ test: 'Hello, world 2' });
})();

function delay(milliseconds: number) {
    return new Promise(res => {
        setTimeout(res, milliseconds);
    });
}
