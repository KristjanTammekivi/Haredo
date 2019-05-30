import 'mocha';
import { expect } from 'chai';
import { Exchange, BadArgumentsError } from '../../src';

describe('Unit: Exchange', () => {
    it('should change exchange to direct on method call', () => {
        const exchange = new Exchange('test').direct();
        expect(exchange.type).to.eql('direct');
    });
    it('should change exchange to topic on method call', () => {
        const exchange = new Exchange('test').topic();
        expect(exchange.type).to.eql('topic');
    });
    it('should change exchange to fanout on method call', () => {
        const exchange = new Exchange('test').fanout();
        expect(exchange.type).to.eql('fanout');
    });
    it('should change exchange to headers on method call', () => {
        const exchange = new Exchange('test').headers();
        expect(exchange.type).to.eql('headers');
    });
    it('should change exchange to delayed on method call', () => {
        const exchange = new Exchange('test').delayed('direct');
        expect(exchange.type).to.eql('x-delayed-message');
    });
    it('should set x-delayed type', () => {
        const exchange = new Exchange('test').delayed('topic');
        expect(exchange.opts.arguments['x-delayed-type']).to.eql('topic');
    });
    it('should set durable', () => {
        const exchange = new Exchange('test').durable();
        expect(exchange.opts.durable).to.be.true;
    });
    it('should set autodelete', () => {
        const exchange = new Exchange('test').autoDelete();
        expect(exchange.opts.autoDelete).to.be.true;
    });
    it('should set alternateExchange', () => {
        const exchange = new Exchange('test').alternateExchange('test2');
        expect(exchange.opts.alternateExchange).to.eql('test2');
        const exchange2 = new Exchange('test3').alternateExchange(exchange);
        expect(exchange2.opts.alternateExchange).to.eql(exchange.name);
    });
    it('should throw an error if x-delayed-type is not provided', () => {
        const fn = () =>  new Exchange('test', 'x-delayed-message');
        expect(fn).to.throw(BadArgumentsError);
    });
    it('should throw an error if x-delayed-type is incorrect', () => {
        const fn = () =>  new Exchange('test', 'x-delayed-message', { arguments: { 'x-delayed-type': 'x-delayed-message' as any } });
        expect(fn).to.throw(BadArgumentsError);
    });
    it('should test exchange equality', () => {
        const exchange1 = new Exchange('test').durable().delayed('topic');
        const exchange2 = new Exchange('test').durable().delayed('topic');
        const exchange3 = new Exchange('test').durable().delayed('direct');
        expect(exchange1.isEqual(exchange2)).to.be.true;
        expect(exchange1.isEqual(exchange3)).to.be.false;
    });
    it('should coerce to string', () => {
        const exchange = new Exchange('test').durable().topic();
        expect(exchange.toString()).to.eql('Exchange test topic opts:arguments={},durable=true');
    });
    it('should clone a new object', () => {
        const exchange = new Exchange('test');
        expect(exchange === exchange.clone()).to.be.false;
    });
});
