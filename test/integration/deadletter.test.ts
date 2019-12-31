import { Haredo, haredo } from '../../src/haredo';
import { setup, teardown, getSingleMessage } from './helpers/amqp';
import { makeQueueConfig } from '../../src/queue';
import { delay } from '../../src/utils';

describe('integration/rpc', () => {
    let rabbit: Haredo;
    beforeEach(async () => {
        await setup();
        rabbit = haredo({
            connection: 'amqp://guest:guest@localhost:5672/test'
        });
    });
    afterEach(async () => {
        rabbit.close();
        await teardown();
    });
    it('should dead forward a message to dead letter exchange when it is declared on queue', async () => {
        const queue = makeQueueConfig('test').dead('test.dlx');
        await rabbit.queue('test.dlq').bindExchange('test.dlx', '', 'fanout').setup();
        await rabbit.queue(queue)
            .subscribe(({ nack }) => nack(false));
        await rabbit.queue(queue).skipSetup().confirm().publish('test');
        await delay(100);
        await getSingleMessage('test.dlq');
    });
    it('should dead letter a message when json parsing fails', async () => {
        const queue = makeQueueConfig('poison').dead('test.dlx');
        await rabbit.queue('test.dlq').bindExchange('test.dlx', '', 'fanout').setup();
        await rabbit.queue(queue)
            .subscribe(() => {});
        await rabbit.queue(queue).skipSetup().json(false).publish('{test');
        await delay(100);
        await getSingleMessage('test.dlq');
    });
});
