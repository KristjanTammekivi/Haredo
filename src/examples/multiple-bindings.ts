import { Haredo } from '../haredo';
import { delay } from '../utils';

export const main = async () => {
    console.log('starting example');
    const haredo = new Haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    await haredo.queue('mydoublebindedqueue', { autoDelete: true })
        .exchange('exchange1', 'direct', ['item.created', 'item.updated'], { autoDelete: true })
        .exchange('exchange2', 'topic', 'item.*', { autoDelete: true })
        .subscribe(msg => console.log(new Date(), msg));
    while (true) {
        await haredo.exchange('exchange1')
            .skipSetup()
            .publish('anItemWasCreated', 'item.created');
        await haredo.exchange('exchange1')
            .skipSetup()
            .publish('anItemWasUpdated', 'item.updated');
        await haredo.exchange('exchange1')
            .skipSetup()
            .publish('thisMessageWillNotBeRouted', 'item.deleted');
        await haredo.exchange('exchange2')
            .skipSetup()
            .publish('anItemWasDeleted', 'item.deleted');
        await delay(1000);
    }
};

process.nextTick(() => main());
