import { Queue } from '../queue';
import { Haredo } from '../haredo';

export const main = async () => {
    const haredo = new Haredo();
    await haredo.connect();
    const queue = new Queue<{ test: true }>('test').durable(false);
    await haredo.assertQueue(queue);
    haredo.queue(queue)
};

main();
