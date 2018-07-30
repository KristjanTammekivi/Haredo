import 'source-map-support/register';
import { Haredo } from '../haredo';
import { Queue } from '../queue';
import { HaredoMessage } from '../message';
import { Exchange, ExchangeType } from '../exchange';

const haredo = new Haredo({ connectionOptions: 'amqp://guest:guest@localhost:5672/', autoAck: true });
(async () => {
    await haredo.connect();

    const queue = new Queue('test');
    const exchange = new Exchange('test.exchange', ExchangeType.Direct, {});

    haredo
        .exchange(exchange, 'routing.key')
        .prefetch(1)
        .queue(queue)
        .subscribe(async (message: HaredoMessage) => {
            console.log('Received message', message.data);
            await delay(1000);
            console.log('Acking message', message.data);
        });

    haredo.exchange(exchange).publish({ test: 'Hello, world 1' }, 'routing.key');
    haredo.exchange(exchange).publish({ test: 'Hello, world 2' }, 'routing.key');
})();

function delay(milliseconds: number) {
    return new Promise(res => {
        setTimeout(res, milliseconds);
    });
}
