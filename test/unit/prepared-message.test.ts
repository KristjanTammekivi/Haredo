import { preparedMessage } from '../../src/prepared-message';
import { expect } from 'chai';

describe('prepared-message', () => {
    it('should set appId', async () => {
        const message = preparedMessage().appId('test');
        expect(message.getState().options.appId).to.equal('test');
    });
    it('should set blindCarbonCopy', async () => {
        const message = preparedMessage().blindCarbonCopy('test');
        expect(message.getState().options.BCC).to.eql(['test']);
    });
    it('should set carbonCopy', async () => {
        const message = preparedMessage().carbonCopy('test');
        expect(message.getState().options.CC).to.eql(['test']);
    });
    it('should set contentEncoding', async () => {
        const message = preparedMessage().contentEncoding('test');
        expect(message.getState().options.contentEncoding).to.equal('test');
    });
    it('should set contentType', async () => {
        const message = preparedMessage().contentType('test');
        expect(message.getState().options.contentType).to.equal('test');
    });
    it('should set correlationId', async () => {
        const message = preparedMessage().correlationId('test');
        expect(message.getState().options.correlationId).to.equal('test');
    });
    it('should set delay', async () => {
        const message = preparedMessage().delay(2000);
        expect(message.getState().options.headers['x-delay']).to.equal(2000);
    });
    it('should set expiration', async () => {
        const message = preparedMessage().expiration(1500);
        expect(message.getState().options.expiration).to.equal(1500);
    });
    it('should set json', async () => {
        const message = preparedMessage().json('test');
        const message2 = preparedMessage().rawContent('"test"').json();
        expect(message.getState().content).to.equal('"test"');
        expect(message.getState().options.contentType).to.equal('application/json');
        expect(message2.getState().options.contentType).to.equal('application/json');
    });
    it('should set mandatory', () => {
        const message = preparedMessage().mandatory();
        expect(message.getState().options.mandatory).to.equal(true);
    });
    it('should set messageId', () => {
        const message = preparedMessage().messageId('test');
        expect(message.getState().options.messageId).to.equal('test');
    });
    it('should set persistent', () => {
        const message = preparedMessage().persistent();
        expect(message.getState().options.persistent).to.equal(true);
    });
    it('should set priority', () => {
        const message = preparedMessage().priority(1);
        expect(message.getState().options.priority).to.equal(1);
    });
    it('should set rawContent', () => {
        const message = preparedMessage().rawContent('test');
        expect(message.getState().content).to.equal('test');
    });
    it('should set replyTo', () => {
        const message = preparedMessage().replyTo('test');
        expect(message.getState().options.replyTo).to.equal('test');
    });
    it('should set routingKey', () => {
        const message = preparedMessage().routingKey('test');
        expect(message.getState().routingKey).to.equal('test');
    });
    it('should set timestamp', () => {
        const timestamp = Date.now();
        const message = preparedMessage().timestamp(timestamp);
        expect(message.getState().options.timestamp).to.equal(timestamp);
    });
    it('should set type', () => {
        const message = preparedMessage().type('test');
        expect(message.getState().options.type).to.equal('test');
    });
    it('should set userId', () => {
        const message = preparedMessage().userId('test');
        expect(message.getState().options.userId).to.equal('test');
    });
    it('should set single header', () => {
        const message = preparedMessage().setHeader('x-test', 'test');
        expect(message.getState().options.headers).to.eql({ 'x-test': 'test' });
    });
    it('should set multiple headers', () => {
        const message = preparedMessage().setHeaders({ headera: 'test', headerb: 'test2' });
        expect(message.getState().options.headers).to.eql({ headera: 'test', headerb: 'test2' });
    });
    it('should merge headers', () => {
        const message = preparedMessage().setHeader('headera', 'test1').setHeader('headerb', 'test2');
        expect(message.getState().options.headers).to.eql({ headera: 'test1', headerb: 'test2' });
    });
});