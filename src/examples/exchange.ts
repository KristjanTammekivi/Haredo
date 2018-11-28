import 'source-map-support/register';
import { Haredo } from '../haredo';
import { Queue } from '../queue';
import { HaredoMessage } from '../message';
import { Exchange, ExchangeType } from '../exchange';
import { delay } from 'bluebird';

const haredo = new Haredo({
    connectionOptions: 'amqp://guest:guest@localhost:5672/',
    autoAck: true,
    forceAssert: true
});
(async () => {
    await haredo.connect();

    const queue = new Queue<{ test: string }>('test', {});
    const exchange1 = new Exchange('test1.exchange', ExchangeType.Direct, {});
    const exchange2 = new Exchange('test2.exchange', ExchangeType.Topic, {});

    haredo
        .exchange(exchange1, 'routing.key')
        .exchange(exchange2, 'routing.#')
        .queue(queue)
        .subscribe(async (message) => {
            console.log('Received message', message.data.test);
            await delay(1000);
            console.log('Acking message', message.data.test);
        })
        .catch(e => console.error);

    haredo.exchange(exchange1).publish({ test: 'Hello, world 1' }, 'routing.key');
    haredo.exchange(exchange2).publish({ test: 'Hello, world 2' }, 'routing.alternativekey');
})();
