import { makeExchangeConfig } from '../../src/exchange';
import { Haredo, haredo } from '../../src/haredo';
import { makeQueueConfig } from '../../src/queue';
import { checkExchange, checkQueue, setup, teardown } from './helpers/amqp';

describe('integration/setup', () => {
    let rabbit: Haredo;
    beforeEach(async () => {
        await setup();
        rabbit = haredo({
            connection: 'amqp://guest:guest@localhost:5672/test'
        });
        await rabbit.connect();
    });
    afterEach(async () => {
        rabbit.close();
        await teardown();
    });
    it('should set up a queue', async () => {
        await rabbit.queue('test').setup();
        await checkQueue('test');
    });
    it('should set up an exchange', async () => {
        await rabbit.exchange('test', 'direct').setup();
        await checkExchange('test', 'direct')
    });
    it('should skipSetup if it is called', async () => {
        const exchange = makeExchangeConfig('test', 'direct');
        await rabbit.exchange(exchange).skipSetup().setup();
        await rabbit.exchange(exchange.fanout()).setup();
    });
    it('should not create queue if passive is true', async () => {
        const queue = makeQueueConfig('test').type('quorum');
        await rabbit.queue(queue).setup();
        await rabbit.queue(queue.type('classic').passive()).setup();
    });
    it('should not create exchange if passive is true', async () => {
        const exchange = makeExchangeConfig('test', 'direct');
        await rabbit.exchange(exchange).setup();
        await rabbit.exchange(exchange.fanout().passive()).setup();
    });
    it('should not create exchanges to bind from if passive is true', async () => {
        const exchange = makeExchangeConfig('test', 'direct');
        const queue = makeQueueConfig('test');
        await rabbit.exchange(exchange.fanout()).setup();
        await rabbit.queue(queue)
            .bindExchange(exchange.passive(), '#')
            .setup();
    });
});
