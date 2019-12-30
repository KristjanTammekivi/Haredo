import { expect } from 'chai';
import { makeExchange } from '../../src/exchange';

describe('unit/exchange', ()=> {
    it('should set durable', () => {
        expect(makeExchange('test', 'direct').durable().getOpts()).to.have.property('durable', true);
        expect(makeExchange('test', 'direct').durable(false).getOpts()).to.have.property('durable', false);
    });
    it('should set autodelete', () => {
        expect(makeExchange('test', 'direct').autoDelete().getOpts()).to.have.property('autoDelete', true);
        expect(makeExchange('test', 'direct').autoDelete(false).getOpts()).to.have.property('autoDelete', false);
    });
    it('should set alternateExchange', () => {
        expect(makeExchange('test', 'direct').alternateExchange('test2').getOpts()).to.have.property('alternateExchange', 'test2');
        const exchange2 = makeExchange('test2', 'direct');
        expect(makeExchange('test', 'direct').alternateExchange(exchange2).getOpts()).to.have.property('alternateExchange', 'test2')
    });
    it('should set type to direct', () => {
        expect(makeExchange('test', 'fanout').direct().getType()).to.equal('direct');
    });
    it('should set type to fanout', () => {
        expect(makeExchange('test', 'fanout').fanout().getType()).to.equal('fanout');
    });
    it('should set type to headers', () => {
        expect(makeExchange('test', 'headers').headers().getType()).to.equal('headers');
    });
    it('should set type to topic', () => {
        expect(makeExchange('test', 'topic').topic().getType()).to.equal('topic');
    });
    it('should set type to delayed', () => {
        expect(makeExchange('test', 'fanout').delayed('fanout').getType()).to.equal('x-delayed-message');
        expect(makeExchange('test', 'fanout').delayed('fanout').getOpts().arguments['x-delayed-type']).to.equal('fanout');
    });
});
