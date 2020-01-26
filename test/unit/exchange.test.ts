import { expect } from 'chai';
import { makeExchangeConfig, isHaredoExchange } from '../../src/exchange';
import { makeQueueConfig } from '../../src/queue';

describe('unit/exchange', ()=> {
    it('should set durable', () => {
        expect(makeExchangeConfig('test', 'direct').durable().getOpts()).to.have.property('durable', true);
        expect(makeExchangeConfig('test', 'direct').durable(false).getOpts()).to.have.property('durable', false);
    });
    it('should set autodelete', () => {
        expect(makeExchangeConfig('test', 'direct').autoDelete().getOpts()).to.have.property('autoDelete', true);
        expect(makeExchangeConfig('test', 'direct').autoDelete(false).getOpts()).to.have.property('autoDelete', false);
    });
    it('should set alternateExchange', () => {
        expect(makeExchangeConfig('test', 'direct').alternateExchange('test2').getOpts()).to.have.property('alternateExchange', 'test2');
        const exchange2 = makeExchangeConfig('test2', 'direct');
        expect(makeExchangeConfig('test', 'direct').alternateExchange(exchange2).getOpts()).to.have.property('alternateExchange', 'test2')
    });
    it('should set type to direct', () => {
        expect(makeExchangeConfig('test', 'fanout').direct().getType()).to.equal('direct');
    });
    it('should set type to fanout', () => {
        expect(makeExchangeConfig('test', 'fanout').fanout().getType()).to.equal('fanout');
    });
    it('should set type to headers', () => {
        expect(makeExchangeConfig('test', 'headers').headers().getType()).to.equal('headers');
    });
    it('should set type to topic', () => {
        expect(makeExchangeConfig('test', 'topic').topic().getType()).to.equal('topic');
    });
    it('should set type to delayed', () => {
        expect(makeExchangeConfig('test', 'fanout').delayed('fanout').getType()).to.equal('x-delayed-message');
        expect(makeExchangeConfig('test', 'fanout').delayed('fanout').getOpts().arguments['x-delayed-type']).to.equal('fanout');
    });
    it('should correctly identify a exchange chain', () => {
        expect(isHaredoExchange(makeExchangeConfig('test', 'fanout'))).to.be.true;
    });
    it('should not identify queues as exchanges', () => {
        expect(isHaredoExchange(makeQueueConfig('test'))).to.be.false;
    });
    it('should not throw on null', () => {
        expect(isHaredoExchange(null)).to.be.false;
    });
});
