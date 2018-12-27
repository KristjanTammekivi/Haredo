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

    it('should bind one exchange to another', async () => {
        const exchange1 = new Exchange('testExchange', ExchangeType.Direct);
        const exchange2 = new Exchange('testExchange', ExchangeType.Direct);
        const queue = new Queue('testQueue').durable();
        await haredo.queue(queue).exchange(exchange2, '*').setup();
        await exchange1.bind(getChannel, exchange2, '*');
        await haredo.exchange(exchange1).publish({ test: 1 }, 'testroutingkey');
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
        it('should set autodelete', () => {
            const exchange = new Exchange('testExchange', ExchangeType.Direct).autoDelete(true);
            expect(exchange.opts.autoDelete).to.be.true;
        });
        it('should set alternateechange', () => {
            const exchange2 = new Exchange('testExchange2', ExchangeType.Direct);
            const exchange = new Exchange('testExchange', ExchangeType.Direct).alternateExchange(exchange2);
            expect(exchange.opts.alternateExchange).to.eql(exchange2.name);
        });
    });

    it('should stringify', () => {
        const exchange = new Exchange('test', ExchangeType.Direct);
        expect(exchange.toString()).to.eql('Exchange test direct opts:arguments={}');
    });

});
