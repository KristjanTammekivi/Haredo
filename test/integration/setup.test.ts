import { Haredo, haredo } from '../../src/haredo';
import { setup, teardown, checkQueue, checkExchange } from './helpers/amqp';

describe('integration/setup', () => {
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
    it('should set up a queue', async () => {
        await rabbit.queue('test').setup();
        await checkQueue('test');
    });
    it('should set up an exchange', async () => {
        await rabbit.exchange('test', 'direct').setup();
        await checkExchange('test', 'direct')
    });
});
