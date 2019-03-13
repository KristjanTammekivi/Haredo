import { Haredo, Queue } from '..';
import { createVhost } from '../../test/integration/helpers/amqp';
import { delayPromise } from '../utils';

const mainFunction = async () => {
    await createVhost();
    const haredo = new Haredo({
        connectionOptions: 'amqp://guest:guest@localhost:5672/test',
        autoAck: true
    });
    await haredo.connect();
    const queue = new Queue<{ test: number }>('simpleQueue').durable();
    await haredo.queue(queue).publish({ test: 1 });
    const consumer = await haredo.queue(queue).subscribe(async message => { });
    await delayPromise(500);
    await haredo.close();
    return 0;
};

mainFunction().then(process.exit).catch((e) => console.log('borked', e));
