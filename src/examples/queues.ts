import { Queue } from '../queue';
import { Haredo } from '../haredo';

export const main = async () => {
    const haredo = new Haredo();
    await haredo.connect();
    const queue = new Queue<{ test: boolean }>('test').expires(2000);
    const queue2 = new Queue('test').expires(2000);
    await haredo.connectionManager.assertQueue(queue);
    await haredo.queue(queue2).publish({ test: true });
    await haredo.queue(queue).reestablish().autoAck().subscribe((message) => {
        console.log(message);
    });
};

main();
