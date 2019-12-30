import { Haredo, haredo } from '../../src/haredo';
import { setup, teardown, getSingleMessage, checkQueue, checkExchange } from './helpers/amqp';
import { expect } from 'chai';
import { ExchangeType, Exchange, makeExchange } from '../../src/exchange';
import { delay } from '../../src/utils';
import { makeQueue } from '../../src/queue';

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
        await rabbit.exchange('test', 'direct', { durable: true }).publish('message', 'routingkey');
        await checkExchange('test', 'direct', { durable: true });
    });
    it ('should setup an exchange with Exchange object', async () => {
        const exchange = makeExchange<string>('test', 'direct').durable();
        await rabbit.exchange(exchange).publish('message', 'routingkey');
        await checkExchange(exchange.getName(), exchange.getType(), exchange.getOpts());
    });
    it('should publish a message to queue', async () => {
        await rabbit.queue('test').publish('message');
        const msg = await getSingleMessage('test');
        expect(msg.content).to.equal(JSON.stringify('message'));
    });
    it('should bind an exchange to a queue', async () => {
        const exchange = makeExchange<string>('testexchange', 'topic');
        const queue = makeQueue<number>('testqueue');
        await rabbit.queue(queue).bindExchange(exchange, '*').publish('message');
        const msg = await getSingleMessage(queue.getName());
        expect(msg.content).to.equal(JSON.stringify('message'));
    });
    it('should not publish in json if json is switched off', async () => {
        await rabbit.queue('test').json(false).publish('test');
        await delay(20);
        const msg = await getSingleMessage('test');
        expect(msg.content).to.equal('test');
    });
    it('should publish via confirmChannel to queue', async () => {
        await rabbit.queue('test').confirm(true).publish('test');
        const msg = await getSingleMessage('test');
        expect(msg.content).to.equal('"test"');
    });
    it('should publish via confirmChannel to exchange', async () => {
        await rabbit.queue('test').bindExchange('testexchange', '#', 'fanout').setup();
        await rabbit.exchange('testexchange', 'fanout').confirm().publish('test', 'lolno');
        const msg = await getSingleMessage('test');
        expect(msg.content).to.equal('"test"');
    });
});
