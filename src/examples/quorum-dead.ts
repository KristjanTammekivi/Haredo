import { haredo } from '../haredo';
import { e, q } from '../index';
import { delay } from '../utils';

const main = async () => {
    const rabbit = haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    const deadExchange = e('quorumtest.dead', 'topic').autoDelete(true);
    await rabbit.exchange(deadExchange).setup();
    const queue = q<{ test: boolean, time: number }>('quorumtest')
    .dead(deadExchange)
    .expires(60000);
    await rabbit.queue(queue)
        .bindExchange(deadExchange, '#')
        .subscribe(async ({ nack, deliveryCount }) => {
            console.log('Delivery count', deliveryCount);
            await delay(1000);
            nack(false);
        });
    await rabbit.queue(queue).publish({ test: true, time: Date.now() });
};

process.nextTick(main);
