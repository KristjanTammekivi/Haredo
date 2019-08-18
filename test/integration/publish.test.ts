import { Haredo, haredo } from '../../src/haredo';
import { setup, teardown, getSingleMessage, checkQueue, checkExchange } from './helpers/amqp';
import { expect } from 'chai';
import { ExchangeType, Exchange } from '../../src/exchange';
import { Queue } from '../../src/queue';
import { delay } from '../../src/utils';

describe('integration/publish', () => {
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
    it ('should setup an exchange with Exchange object', async () => {
        const exchange = new Exchange<string>('test', 'direct').durable();
        await rabbit.exchange(exchange).publish('message', 'routingkey');
        await checkExchange(exchange.name, exchange.type, exchange.opts);
    });
    it('should publish a message to queue', async () => {
        await rabbit.queue('test').publish('message');
        const msg = await getSingleMessage('test');
        expect(msg.content).to.equal(JSON.stringify('message'));
    });
    it('should bind an exchange to a queue', async () => {
        const exchange = new Exchange<string>('testexchange', 'topic');
        const queue = new Queue<number>('testqueue');
        await rabbit.queue(queue).bindExchange(exchange, '*').publish('message');
        const msg = await getSingleMessage(queue.name);
        expect(msg.content).to.equal(JSON.stringify('message'));
    });
    it('should not publish in json if json is switched off', async () => {
        await rabbit.queue('test').json(false).publish('test');
        await delay(20);
        const msg = await getSingleMessage('test');
        expect(msg.content).to.equal('test');
    });
    it('should publish via confirmChannel', async () => {
        await rabbit.queue('test').confirm(true).publish('test');
        const msg = await getSingleMessage('test');
        expect(msg.content).to.equal('"test"');
    });
});
