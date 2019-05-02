import 'source-map-support/register';
import { Haredo } from '../haredo';
import { Queue } from '../queue';
import { HaredoMessage } from '../haredo-message';

const haredo = new Haredo({ connectionOptions: 'amqp://guest:guest@localhost:5672/', autoAck: true });
(async () => {
    await haredo.connect();

    interface SimpleMessage {
        test: string;
    }

    const queue = new Queue<SimpleMessage>('test');

    const chain = haredo.queue(queue);

    const consumer = await chain.prefetch(1).subscribe(async message => {
        console.log('Received message', message.data.test);
        await delay(1000);
        console.log('Acking message', message.data.test);
    });

    chain.publish({ test: 'Hello, world 1' });
    chain.publish({ test: 'Hello, world 2' });

    await delay(1500);

    consumer.cancel();
})();

function delay(milliseconds: number) {
    return new Promise(res => {
        setTimeout(res, milliseconds);
    });
}
