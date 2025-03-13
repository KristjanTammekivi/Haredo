import { Exchange } from '../exchange';
import { Haredo } from '../haredo';
import { delay } from '../utils/delay';

const start = async () => {
    const haredo = Haredo({ url: process.env.RABBIT_URL || 'amqp://localhost' });
    await haredo.connect();

    const exchange = Exchange('testExchange', 'headers').autoDelete();

    await haredo
        .queue<{ id: number }>('testQueue', { autoDelete: true })
        .bindExchange(exchange, [], { 'x-match': 'all', type: 'message-create' })
        .bindExchange(exchange, [], { 'x-match': 'all', type: 'message-update' })
        .subscribe(async (data, { routingKey }) => {
            console.log(new Date(), 'Message created or updated:', data.id, routingKey);
        });

    await haredo
        .queue<{ id: number }>('deleteQueue', { autoDelete: true })
        .bindExchange(exchange, [], { 'x-match': 'all', type: 'message-delete' })
        .subscribe(async (data, { routingKey }) => {
            console.log(new Date(), 'Message deleted:', data.id, routingKey);
        });

    let iteration = 0;
    const types = ['message-create', 'message-update', 'message-delete'];
    while (true) {
        const type = types[iteration % types.length];
        await haredo.exchange<{ id: number }>(exchange).setHeader('type', type).publish({ id: ++iteration }, type);
        await delay(1000);
    }
};

process.nextTick(start);
