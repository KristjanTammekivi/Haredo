import 'mocha';
import { Queue, Haredo, Exchange } from '../../src/index'
import { setup, teardown, getChannel, checkExchange, getSingleMessage } from './helpers/amqp';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { ExchangeType } from '../../src/exchange';

use(chaiAsPromised);

describe('Exchange', () => {
    let haredo: Haredo;
    beforeEach(async () => {
        await setup();
        haredo = new Haredo({
            connectionOptions: 'amqp://guest:guest@localhost:5672/test',
            autoAck: false
        });
        await haredo.connect();
    });
    afterEach(async () => {
        await haredo.close();
        await teardown();
    });

    it('should create exchange', async () => {
        const exchange = new Exchange('testExchange', ExchangeType.Direct);
        await haredo.exchange(exchange).setup();
    });

    interface SimpleMessage {
        test: number;
    }

    it('should bind exchange to queue', async () => {
        const exchange = new Exchange('testExchange', ExchangeType.Direct);
        const queue = new Queue<SimpleMessage>('testQueue').durable();
        await haredo.exchange(exchange, '*').queue(queue).publish({ test: 1 });
        await getSingleMessage(queue.name);
    });

    describe('methods', () => {
        it('should assert exchange', async () => {
            const exchange = new Exchange('testExchange', ExchangeType.Direct).durable();
            await exchange.assert(getChannel);
            await checkExchange(exchange.name, exchange.type, { durable: true });
        });
        it('should delete exchange', async () => {
            const exchange = new Exchange('testExchange', ExchangeType.Direct);
            await exchange.delete(getChannel);
            await expect(checkExchange(exchange.name, exchange.type)).to.eventually.be.rejectedWith(/NOT_FOUND/);
        });
        it('should force assert exchange', async () => {
            const exchange = new Exchange('testExchange', ExchangeType.Direct);
            await exchange.assert(getChannel);
            const newExchange = new Exchange('testExchange', ExchangeType.Topic);
            await expect(newExchange.assert(getChannel)).to.eventually.be.rejectedWith(/PRECONDITION_FAILED/);
            await newExchange.assert(getChannel, true);
        });
    });

});
