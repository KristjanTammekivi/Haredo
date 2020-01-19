import { haredo } from '../haredo';
import { e } from '../index';
import { delay } from '../utils';
import { preparedMessage } from '../prepared-message';

export const main = async () => {
    const rabbit = haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    interface Message {
        id: number;
    }
    const delayedExchange = e<Message>('my-delayed-exchange', 'x-delayed-message').delayed('topic');
    await rabbit.queue('my-queue')
        .bindExchange(delayedExchange, '#')
        .subscribe(({ data, timestamp }) => {
            console.log(`Received message in ${ Date.now() - timestamp }ms id:${ data.id } `);
        });
    const delayedMessage = preparedMessage().routingKey('item').delay(2000);
    let id = 0;
    while (true) {
        id += 1;
        console.log('Publishing message', id);
        const msg = delayedMessage.json({ id }).timestamp(Date.now());
        await rabbit
            .exchange(delayedExchange)
            .publish(msg);
        await delay(2000);
    }
};

process.nextTick(main);
