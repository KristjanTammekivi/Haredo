import 'source-map-support/register';
import { Haredo } from '../haredo';
import { Queue } from '../queue';
import { Exchange, ExchangeType } from '../exchange';
import { delay } from 'bluebird';

const haredo = new Haredo({
    connectionOptions: 'amqp://guest:guest@localhost:5672/',
    autoAck: true,
    forceAssert: true
});
(async () => {
    await haredo.connect();

    interface SimpleMessage {
        test: string;
    }

    interface AlternativeSimpleMessage {
        test: number;
    }

    const queue = new Queue<SimpleMessage>('test', {});
    const exchange1 = new Exchange('test1.exchange', ExchangeType.Direct, {});
    const exchange2 = new Exchange<AlternativeSimpleMessage>('test2.exchange', ExchangeType.Topic, {});

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

    haredo.exchange(exchange1).publish({ test: 'Hello, world' }, 'routing.key');
    haredo.exchange(exchange2).publish({ test: 2 }, 'routing.alternativekey');
})();
