import { Queue } from '../queue';
import { Haredo } from '../haredo';
import { Exchange } from '../exchange';
import { PreparedMessage } from '../prepared-message';
import { delay } from 'bluebird';

export const main = async () => {
    console.log('starting example');
    const haredo = new Haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    await haredo.connect();
    await haredo.queue('graceful-shutdown-example', { expires: 2000 }).publish({ time: Date.now() });
    await haredo.queue('graceful-shutdown-example', { expires: 2000 }).subscribe(async (msg) => {
        console.log('Message received');
        await delay(1000);
        console.log('Message about to be acked');
    });
    await delay(100);
    console.log('Closing haredo');
    await haredo.close();
    // internally it calls .cancel on the return value of .subscribe
    // and waits for all the messages to be handled
    console.log('Haredo closed');

};

process.nextTick(() => main());
