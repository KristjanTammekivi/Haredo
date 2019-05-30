import 'mocha';
import { expect } from 'chai';
import { Queue, Exchange } from '../../src';

describe('Unit: Queue', () => {
    it('should set queue as non-durable', () => {
        const queue = new Queue().durable(false);
        expect(queue.opts.durable).to.be.false;
    });
    it('should set queue as durable', () => {
        const queue = new Queue().durable(false).durable();
        expect(queue.opts.durable).to.be.true;
    });
    it('should set autoDelete', () => {
        const queue = new Queue().autoDelete();
        expect(queue.opts.autoDelete).to.be.true;
    });
    it('should set queue as non-exclusive', () => {
        const queue = new Queue().exclusive(false);
        expect(queue.opts.exclusive).to.be.false;
    });
    it('should set queue as exclusive', () => {
        const queue = new Queue().exclusive(false).exclusive();
        expect(queue.opts.exclusive).to.be.true;
    });
    it('should set queue expiry', () => {
        const queue = new Queue().expires(200);
        expect(queue.opts.expires).to.eql(200);
    });
    it('should set queue messageTtl', () => {
        const queue = new Queue().messageTtl(200);
        expect(queue.opts.messageTtl).to.eql(200);
    });
    it('should set queue messageTtl', () => {
        const exchange = new Exchange('test');
        const queue = new Queue().dead(exchange, 'item.created');
        expect(queue.opts.deadLetterExchange).to.eql(exchange.name);
        expect(queue.opts.deadLetterRoutingKey).to.eql('item.created');
        const queue2 = new Queue().dead('myexchange');
        expect(queue2.opts.deadLetterExchange).to.eql('myexchange');
    });
    it('should determine equality', () => {
        const queue1 = new Queue('test').durable();
        const queue2 = new Queue('test').durable();
        const queue3 = new Queue('test').durable().autoDelete();
        expect(queue1.isEqual(queue2)).to.be.true;
        expect(queue2.isEqual(queue3)).to.be.false;
    });
    it('should coerce to a string', () => {
        const queue = new Queue('test').durable();
        expect(queue.toString()).to.eql('Queue test opts:durable=true,exclusive=false,arguments={}');
        const queue2 = new Queue().durable();
        expect(queue2.toString()).to.eql('Queue opts:durable=true,exclusive=false,arguments={}');
    });
    it('should clone a new object', () => {
        const queue = new Queue();
        expect(queue.clone() === queue).to.be.false;
    });
});
