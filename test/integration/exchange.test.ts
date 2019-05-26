import 'mocha';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { Haredo, Queue, Exchange, ExchangeType, PreparedMessage } from '../../src/index';
import { setup, teardown, verifyQueue, getSingleMessage, checkExchange } from './helpers/amqp';
import { delay } from '../../src/utils';

use(chaiAsPromised);

describe('Exchange', () => {
    let haredo: Haredo
    beforeEach(async () => {
        await setup();
        haredo = new Haredo({
            connection: 'amqp://guest:guest@localhost:5672/test'
        });
        await haredo.connect();
    });
    afterEach(async () => {
        await haredo.close();
        await teardown();
    });
    it('should declare a direct exchange', async () => {
        const exchange = new Exchange('test', ExchangeType.Direct);
        await haredo.exchange(exchange).setup();
        await expect(checkExchange('test', ExchangeType.Direct, exchange.opts)).to.eventually.be.fulfilled;
    });
    it('should declare a topic exchange', async () => {
        const exchange = new Exchange('test', ExchangeType.Topic);
        await haredo.exchange(exchange).setup();
        await expect(checkExchange('test', ExchangeType.Topic, exchange.opts)).to.eventually.be.fulfilled;
    });
    it('should declare a fanout exchange', async () => {
        const exchange = new Exchange('test', ExchangeType.Fanout);
        await haredo.exchange(exchange).setup();
        await expect(checkExchange('test', ExchangeType.Fanout, exchange.opts)).to.eventually.be.fulfilled;
    });
    it('should declare a headers exchange', async () => {
        const exchange = new Exchange('test', ExchangeType.Headers);
        await haredo.exchange(exchange).setup();
        await expect(checkExchange('test', ExchangeType.Headers, exchange.opts)).to.eventually.be.fulfilled;
    });
    describe('Delayed exchange', () => {
        it('should declare a delayed exchange', async () => {
            const exchange = new Exchange('test', ExchangeType.Delayed, { arguments: { "x-delayed-type": ExchangeType.Direct } });
            await haredo.exchange(exchange).setup();
            await expect(checkExchange('test', ExchangeType.Delayed, exchange.opts)).to.eventually.be.fulfilled;
        });
        it('should have a method to set up a delayed exchange', async () => {
            const exchange = new Exchange('test').delayed('topic')
            await haredo.exchange(exchange).setup();
            await expect(checkExchange('test', ExchangeType.Delayed, exchange.opts)).to.be.fulfilled;
        });
        it('should delay a message', async () => {
            const exchange = new Exchange('test').delayed('direct');
            const message = new PreparedMessage({})
                .setContent({})
                .delay(150);
            await haredo.exchange(exchange, '').queue('test').publish(message, '');
            let messageReceived = false;
            await haredo
                .queue('test')
                .subscribe(() => {
                    messageReceived = true;
                });
            await delay(50);
            expect(messageReceived).to.be.false;
            await delay(200);
            expect(messageReceived).to.be.true;
        });
    });
    it('should be able to bind multiple exchanges in the same chain', async () => {
        const exchange = new Exchange('test', 'fanout');
        const chain = haredo.exchange(exchange, '#').exchange('test2', 'topic', '#').queue('test');
        await chain.setup();
        await Promise.all([
            await haredo.exchange(exchange, '#').publish(1, 'test'),
            await haredo.exchange('test2', 'topic').publish(2, 'test2')
        ]);
        let messagesHandled = 0;
        await chain.subscribe((msg) => {
            messagesHandled++;
        });
        await delay(200);
        expect(messagesHandled).to.equal(2);
    });
});
