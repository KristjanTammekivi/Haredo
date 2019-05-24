import 'mocha';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { Haredo, Queue, Exchange, ExchangeType } from '../../src/index';
import { setup, teardown, verifyQueue, getSingleMessage, checkExchange } from './helpers/amqp';
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
    describe('Delayed queue', () => {
        it('should declare a delayed exchange', async () => {
            const exchange = new Exchange('test', ExchangeType.Delayed, { arguments: { "x-delayed-type": ExchangeType.Direct } });
            await haredo.exchange(exchange).setup();
            await expect(checkExchange('test', ExchangeType.Delayed, exchange.opts)).to.eventually.be.fulfilled;
        });
        it('should have a method to set up a delayed queue', async () => {
            const exchange = new Exchange('test').delayed('topic')
            await haredo.exchange(exchange).setup();
            await expect(checkExchange('test', ExchangeType.Delayed, exchange.opts)).to.be.fulfilled;
        });
    });
});
