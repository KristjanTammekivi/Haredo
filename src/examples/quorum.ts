import { haredo } from '../haredo';
import { e, q } from '../index';
import { delay } from '../utils';

const main = async () => {
    const chain = haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    const deadExchange = e('quorumtest.dead', 'topic').autoDelete(true);
    await chain
        .queue(q('quorumtest.dlq').expires(2000))
        .bindExchange(deadExchange, '#')
        .subscribe(({ data }) => {
            console.log('Received message in dead letter queue', data);
        });
    const queue = q<{ test: number, time: number }>('quorumtest')
        .expires(2000)
        .type('quorum')
        .deliveryLimit(2)
        .dead(deadExchange);
    await chain.queue(queue)
        .subscribe(({ getHeader, nack }) => {
            console.log('Delivery count', getHeader('x-delivery-count'));
            nack(true);
        });
    let i = 1;
    while (true) {
        await chain.queue(queue).publish({ test: i, time: Date.now() });
        await delay(5000);
        i += 1;
    }
};

process.nextTick(main);
