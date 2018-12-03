import 'mocha';
import { Queue, Haredo, Exchange, ExchangeType } from '../../src/index'
import {
    setup,
    teardown
} from './helpers/amqp';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

describe('Queue', () => {
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
    it('should set reestablish', () => {
        const queue = new Queue();
        expect(haredo.queue(queue).reestablish().state.reestablish).to.be.true;
    });
    it('should set failSpan', () => {
        const queue = new Queue();
        expect(haredo.queue(queue).failSpan(5).state.failSpan).to.equal(5);
    });
    it('should set failThreshold', () => {
        const queue = new Queue();
        expect(haredo.queue(queue).failThreshold(5).state.failThreshold).to.equal(5);
    });
    it('should set failTimeout', () => {
        const queue = new Queue();
        expect(haredo.queue(queue).failTimeout(5).state.failTimeout).to.equal(5);
    });
    it('should set prefetch', () => {
        const queue = new Queue();
        expect(haredo.queue(queue).prefetch(5).state.prefetch).to.equal(5);
    });
    it('should set json', () => {
        const queue = new Queue();
        expect(haredo.queue(queue).json().state.json).to.be.true;
    });
    it('should throw when attempting to set a queue twice', () => {
        const queue = new Queue();
        expect(() => haredo.queue(queue).queue(queue)).to.throw();
    });
    it('should throw when subscribing without setting a queue', async () => {
        const exchange = new Exchange('testExchange', ExchangeType.Direct);
        await expect(haredo.exchange(exchange).subscribe(() => { }))
            .to.eventually.be.rejectedWith(`Can't subscribe without queue`);
    });
    it('should reject when a queue and exchange are added without a pattern', async () => {
        const exchange = new Exchange('test', ExchangeType.Direct);
        const queue = new Queue();
        await expect(haredo.queue(queue).exchange(exchange).setup())
            .to.be.rejectedWith('Exchange added without pattern for binding');
    });
});
