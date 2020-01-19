import { expect } from 'chai';
import { makeQueueConfig } from '../../src/queue';
import { makeExchangeConfig } from '../../src/exchange';

describe('unit/queue', ()=> {
    it('should set durable', () => {
        expect(makeQueueConfig('test').durable().getOpts()).to.have.property('durable', true);
    });
    it('should set autoDelete', () => {
        expect(makeQueueConfig('test').autoDelete().getOpts()).to.have.property('autoDelete', true);
    });
    it('should set exclusive', () => {
        expect(makeQueueConfig('test').exclusive().getOpts()).to.have.property('exclusive', true);
    });
    it('should set messageTtl', () => {
        expect(makeQueueConfig('test').messageTtl(250).getOpts()).to.have.property('messageTtl', 250);
    });
    it('should set maxLength', () => {
        expect(makeQueueConfig('test').maxLength(250).getOpts()).to.have.property('maxLength', 250);
    });
    it('should set expires', () => {
        expect(makeQueueConfig('test').expires(250).getOpts()).to.have.property('expires', 250);
    });
    it('should set name', () => {
        expect(makeQueueConfig('test').name('queue2').getName()).to.equal('queue2');
    });
    it('should set dead letter exchange', () => {
        expect(makeQueueConfig('test').dead('test', 'testrk').getOpts()).to.have.property('deadLetterExchange', 'test');
        expect(makeQueueConfig('test').dead('test', 'testrk').getOpts()).to.have.property('deadLetterRoutingKey', 'testrk');
        const exchange = makeExchangeConfig('testexchange', 'direct');
        expect(makeQueueConfig('test').dead(exchange).getOpts()).to.have.property('deadLetterExchange', exchange.getName());
    });
});
