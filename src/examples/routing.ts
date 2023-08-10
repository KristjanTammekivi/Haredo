import { Haredo } from '../haredo';
import { delay } from '../utils/delay';

const start = async () => {
    const haredo = Haredo({ url: process.env.RABBIT_URL || 'amqp://localhost' });
    await haredo.connect();

    await haredo
        .queue<{ id: number }>('testQueue')
        .bindExchange('testExchange', ['message.new', 'message.updated'], 'topic')
        .subscribe(async ({ data, routingKey }) => {
            console.log(new Date(), 'Message created or updated:', data.id, routingKey);
        });

    await haredo
        .queue<{ id: number }>('deleteQueue')
        .bindExchange('testExchange', 'message.deleted', 'topic')
        .subscribe(async ({ data, routingKey }) => {
            console.log(new Date(), 'Message deleted:', data.id, routingKey);
        });

    let iteration = 0;
    const routingKeys = ['message.new', 'message.updated', 'message.deleted'];
    while (true) {
        const routingKey = routingKeys[iteration % routingKeys.length];
        await haredo.exchange<{ id: number }>('testExchange', 'topic').publish({ id: ++iteration }, routingKey);
        await delay(1000);
    }
};

process.nextTick(start);
