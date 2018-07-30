import 'source-map-support/register';
import { Haredo } from '../haredo';
import { Queue } from '../queue';
import { HaredoMessage } from '../message';

const haredo = new Haredo({ connectionOptions: 'amqp://guest:guest@localhost:5672/', autoAck: true });

haredo.connect().then(async () => {
    const queue = new Queue('test');

    await haredo.queue(queue).setup();

    haredo.queue(queue).subscribe((message: HaredoMessage) => {
        console.log('Received message', message.data);
    });

    haredo.queue(queue).publish({ test: 'Hello, world' });
});
