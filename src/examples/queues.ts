import { Queue } from '../queue';
import { Haredo } from '../haredo';

export const main = async () => {
    const haredo = new Haredo();
    await haredo.connect();
    const queue = new Queue<{ test: boolean }>('test').durable(false);
    const queue2 = new Queue('test').durable(false);
    await haredo.assertQueue(queue);
    haredo.queue(queue2).publish({ test: true });
    haredo.queue(queue).subscribe((message) => { });
};

main();
