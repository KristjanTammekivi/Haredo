import { Exchange } from '../exchange';
import { Haredo } from '../haredo';
import { delay } from '../utils/delay';

const start = async () => {
    const haredo = Haredo({ url: process.env.RABBIT_URL || 'amqp://localhost' });
    await haredo.connect();

    const exchange = Exchange<{ id: number; timestamp: number }>('testExchange', 'topic').delayed().autoDelete();

    await haredo
        .queue('testQueue')
        .bindExchange(exchange, ['message.new', 'message.updated'])
        .prefetch(1)
        .subscribe(async ({ id, timestamp }) => {
            console.log(new Date(), `Message created or updated after ${ Date.now() - timestamp }ms: ${ id }`);
        });

    let iteration = 0;
    while (true) {
        console.log(new Date(), 'Publishing message', iteration);
        const delayMessageBy = 1000;
        await haredo
            .exchange(exchange)
            .delay(delayMessageBy)
            .skipSetup()
            .publish({ id: ++iteration, timestamp: Date.now() }, 'message.new');
        await delay(1000);
    }
};

process.nextTick(start);
