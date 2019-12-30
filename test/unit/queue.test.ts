import { expect } from 'chai';
import { makeQueue } from '../../src/queue';
import { makeExchange } from '../../src/exchange';

describe('unit/queue', ()=> {
    it('should set durable', () => {
        expect(makeQueue('test').durable().getOpts()).to.have.property('durable', true);
    });
    it('should set autoDelete', () => {
        expect(makeQueue('test').autoDelete().getOpts()).to.have.property('autoDelete', true);
    });
    it('should set exclusive', () => {
        expect(makeQueue('test').exclusive().getOpts()).to.have.property('exclusive', true);
    });
    it('should set messageTtl', () => {
        expect(makeQueue('test').messageTtl(250).getOpts()).to.have.property('messageTtl', 250);
    });
    it('should set maxLength', () => {
        expect(makeQueue('test').maxLength(250).getOpts()).to.have.property('maxLength', 250);
    });
    it('should set expires', () => {
        expect(makeQueue('test').expires(250).getOpts()).to.have.property('expires', 250);
    });
    it('should set name', () => {
        expect(makeQueue('test').name('queue2').getName()).to.equal('queue2');
    });
    it('should set dead letter exchange', () => {
        expect(makeQueue('test').dead('test', 'testrk').getOpts()).to.have.property('deadLetterExchange', 'test');
        expect(makeQueue('test').dead('test', 'testrk').getOpts()).to.have.property('deadLetterRoutingKey', 'testrk');
        const exchange = makeExchange('testexchange', 'direct');
        expect(makeQueue('test').dead(exchange).getOpts()).to.have.property('deadLetterExchange', exchange.getName());
    });
});
