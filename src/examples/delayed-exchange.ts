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
    interface SimpleMessage {
        time: number;
    }
    const queue = new Queue<SimpleMessage>('my-queue').expires(2000);
    const exchange = new Exchange<SimpleMessage>('my-delayed-exchange').delayed('direct').autoDelete();
    const message = new PreparedMessage<SimpleMessage>({}).delay(1000).setRoutingKey('item');
    await haredo
        .queue(queue)
        .exchange(exchange, 'item')
        .subscribe((msg) => {
            console.log('Message was delayed', new Date().getTime() - msg.time, 'ms');
        });
    while (true) {
        await haredo
            .exchange(exchange)
            .skipSetup()
            .publish(message.json({ time: new Date().getTime() }), 'item');
        await delay(2000);
    }
};

process.nextTick(() => main());
