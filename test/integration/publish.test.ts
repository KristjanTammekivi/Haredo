import { Haredo, haredo } from '../../src/haredo';
import { setup, teardown, getSingleMessage, checkQueue, checkExchange } from './helpers/amqp';
import { expect } from 'chai';
import { ExchangeType } from '../../src/exchange';

describe('publishing', () => {
    let rabbit: Haredo;
    beforeEach(async () => {
        await setup();
        rabbit = haredo({
            connection: 'amqp://localhost:5672/test'
        });
    });
    afterEach(async () => {
        rabbit.close();
        await teardown();
    });
    it('should setup queue when publish is called', async () => {
        await rabbit.queue('test').publish('message');
        await checkQueue('test');
    });
    it('should setup exchange when publish is called', async () => {
        await rabbit.exchange('test', ExchangeType.Direct, { durable: true }).publish('message', 'routingkey');
        await checkExchange('test', ExchangeType.Direct, { durable: true });
    });
    it('should publish a message to queue', async () => {
        await rabbit.queue('test').publish('message');
        const msg = await getSingleMessage('test');
        expect(msg.content).to.equal(JSON.stringify('message'));
    });
});
