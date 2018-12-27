import { PreparedMessage } from '../../src';
import { expect } from 'chai';

describe('PreparedMessage Unit', () => {
    it('should set x-delay header', () => {
        expect(new PreparedMessage().delay(50).settings).to.have.property('headers');
        expect(new PreparedMessage().delay(50).settings.headers).to.have.property('x-delay', 50);
    });
    it('should set contentEncoding', () => {
        expect(new PreparedMessage().contentEncoding('utf8').settings).to.have.property('contentEncoding', 'utf8');
    });
    it('should set contentType', () => {
        expect(new PreparedMessage().contentType('application/json').settings).to.have.property('contentType', 'application/json');
    });
    it('should set correlationId', () => {
        expect(new PreparedMessage().correlationId('test').settings).to.have.property('correlationId', 'test');
    });
    it('should set deliveryMode', () => {
        expect(new PreparedMessage().deliveryMode(1).settings).to.have.property('deliveryMode', 1);
    });
    it('should set expiration', () => {
        expect(new PreparedMessage().expiration(1000).settings).to.have.property('expiration', 1000);
    });
    it('should set mandatory', () => {
        expect(new PreparedMessage().mandatory().settings).to.have.property('mandatory', true);
    });
    it('should set messageId', () => {
        expect(new PreparedMessage().messageId('test').settings).to.have.property('messageId', 'test');
    });
    it('should set persistent', () => {
        expect(new PreparedMessage().persistent(true).settings).to.have.property('persistent', true);
    });
    it('should set priority', () => {
        expect(new PreparedMessage().priority(5).settings).to.have.property('priority', 5);
    });
    it('should set replyTo', () => {
        expect(new PreparedMessage().replyTo('test').settings).to.have.property('replyTo', 'test');
    });
    it('should setHeader', () => {
        expect(new PreparedMessage().setHeader('test', 'test').settings).to.have.property('headers');
        expect(new PreparedMessage().setHeader('test', 'test').settings.headers).to.have.property('test', 'test');
    });
    it('should set type', () => {
        expect(new PreparedMessage().type('test').settings).to.have.property('type', 'test');
    });
    it('should set content', () => {
        expect(new PreparedMessage().content('test').settings).to.have.property('content', 'test');
    });
    it('should set routing key', () => {
        expect(new PreparedMessage().routingKey('test').settings).to.have.property('routingKey', 'test');
    });
    it('should set timestamp', () => {
        const timestamp = new Date().getTime();
        expect(new PreparedMessage().timestamp(timestamp).settings).to.have.property('timestamp', timestamp);
    });
    it('should set userId', () => {
        expect(new PreparedMessage().userId('test').settings).to.have.property('userId', 'test');
    });
    it('should set appId', () => {
        expect(new PreparedMessage().appId('test').settings).to.have.property('appId', 'test');
    });
    it('should set json', () => {
        expect(new PreparedMessage().json({ test: 5 }).settings.content).to.eql({ test: 5 });
        expect(new PreparedMessage().json({ test: 5 }).settings).to.have.property('headers');
        expect(new PreparedMessage().json({ test: 5 }).settings.headers).to.have.property('Content-Type', 'application/json');
    });
    describe('getOptions', () => {
        it('should return set options', () => {
            const message = new PreparedMessage()
                .expiration(50)
                .persistent();
            expect(message.getOptions()).to.eql({
                expiration: 50,
                persistent: true
            });
        });
        it('should not return content', () => {
            const message = new PreparedMessage<'test'>()
                .expiration(50)
                .content('test');
            expect(message.getOptions()).to.eql({
                expiration: 50
            });
        });
        it('should not return routing key', () => {
            const message = new PreparedMessage<'test'>()
                .expiration(50)
                .routingKey('test');
            expect(message.getOptions()).to.eql({
                expiration: 50
            });
        });
    });
    describe('getContent', () => {
        it('should return content', () => {
            const message = new PreparedMessage<'test'>()
                .expiration(50)
                .content('test');
            expect(message.getContent()).to.eql('test');
        });
        it('should throw when not set and strict is true', () => {
            const message = new PreparedMessage<'test'>()
                .expiration(50);
            expect(() => message.getContent(true)).to.throw();
        });
    });
    describe('getRoutingKey', () => {
        it('should return content', () => {
            const message = new PreparedMessage<'test'>()
                .expiration(50)
                .routingKey('test');
            expect(message.getRoutingKey()).to.eql('test');
        });
        it('should throw when not set and strict is true', () => {
            const message = new PreparedMessage<'test'>()
                .expiration(50);
            expect(() => message.getRoutingKey(true)).to.throw();
        });
    });
    describe('toString', () => {
        it('should convert message to human readable format', () => {
            const message = new PreparedMessage();
            expect(message.toString()).to.eql('PreparedMessage opts:');
        });
        it('should stringify settings', () => {
            const message = new PreparedMessage()
                .expiration(50);
            expect(message.toString()).to.eql('PreparedMessage opts:expiration=50');
        })
    });
});