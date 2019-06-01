import { Queue } from '../queue';
import { Haredo } from '../haredo';

export const main = async () => {
    const haredo = new Haredo({
        connection: 'amqp://localhost:5672'
    });
    await haredo.connect();
    const queue = new Queue<{ test: boolean }>('test').expires(2000);
    const queue2 = new Queue('test').expires(2000);
    await haredo.connectionManager.assertQueue(queue);
    await haredo.queue(queue2).publish({ test: true });
    await haredo.queue(queue).subscribe((message) => {
        console.log(message);
    });
};

process.nextTick(main);
