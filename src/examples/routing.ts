import { haredo } from '../haredo';
import { makeQueue } from '../queue';
import { Exchange } from '../exchange';
import { delay } from '../utils';

export const main = async () => {
    const chain = haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    const queue = makeQueue('test').autoDelete();
    const messagesExchange = new Exchange<{ id: number; body: string }>('messages', 'topic').autoDelete();
    const usersExchange = new Exchange<{ id: number; name: string }>('users', 'topic').autoDelete();
    await chain.queue(queue)
        .bindExchange(messagesExchange, 'message.#')
        .bindExchange(usersExchange, ['user.create', 'user.update'])
        .subscribe(({ data, routingKey }) => {
            console.log('Received message, routing key', routingKey, 'id', data.id, 'data', data);
        });
    let id = 0;
    while (true) {
        id += 1;
        console.log('Publishing messages', id);
        await chain.exchange(messagesExchange)
            .publish({ id, body: 'testmessage' }, 'message.create');
        await chain.exchange(usersExchange)
            .publish({ id, name: 'John Smith' }, 'user.create');
        await chain.exchange(usersExchange)
            .publish({ id, name: 'John Jones' }, 'user.update');
        await delay(2000);
    }
};

process.nextTick(main);
