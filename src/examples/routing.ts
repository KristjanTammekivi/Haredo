import { haredo } from '../haredo';
import { q, e } from '../index';
import { delay } from '../utils';

export const main = async () => {
    const chain = haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    // Anonymous queue, server will assign a name when asserted
    const queue = q().autoDelete();
    const messagesExchange = e<{ id: number; body: string }>('messages', 'topic').autoDelete();
    const usersExchange = e<{ id: number; name: string }>('users', 'topic').autoDelete();
    await chain.queue(queue)
        // * in the pattern means 1 dot-separated word
        // could also do just '#' to match everything
        .bindExchange(messagesExchange, 'message.*')
        .bindExchange(usersExchange, ['user.create', 'user.update'])
        .subscribe(({ data, queue, routingKey }) => {
            console.log('Received message in queue', queue, 'routing key', routingKey, 'id', data.id, 'data', data);
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
