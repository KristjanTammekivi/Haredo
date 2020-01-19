import { e, q } from '..';
import { haredo } from '../haredo';
import { delay } from '../utils';

export const main = async () => {
    const rabbit = haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    const dlx = e('test.dead', 'topic');
    await rabbit
        .queue('test.dead.update')
        .bindExchange(dlx, 'item.*')
        .subscribe(({ routingKey }) => {
            console.log('Found a dead lettered message with routing key', routingKey);
        });
    const queue = q('testqueue').dead(dlx);
    await rabbit
        .queue(queue)
        .bindExchange('test', '#', 'topic')
        .subscribe(({ nack }) => {
            if (Math.random() >= 0.5) {
                console.log('Nacking message');
                return nack(false);
            }
            console.log('Acking message');
        });
    while (true) {
        await rabbit.exchange('test', 'topic').skipSetup().publish('hi', Math.random() >= 0.5 ? 'item.created' : 'item.updated');
        await delay(1000);
    }
};

process.nextTick(main);
