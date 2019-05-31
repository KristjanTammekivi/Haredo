import 'mocha';
import { expect } from 'chai';
import { HaredoMessage, Consumer, MessageAlreadyHandledError } from '../../src';
import { Message } from 'amqplib';

describe('Unit: HaredoMessage', () => {
    let messageMock: Message;
    beforeEach(() => {
        messageMock = {
            content: Buffer.from('{}'),
            properties: {
                headers: {
                    'x-delay': 5000
                },
                contentType: 'x',
                contentEncoding: 'y',
                deliveryMode: 2,
                priority: 5,
                correlationId: 'test.message.correlation.id',
                replyTo: undefined,
                expiration: undefined,
                messageId: undefined,
                timestamp: undefined,
                type: undefined,
                userId: undefined,
                appId: undefined,
                clusterId: undefined
            },
            fields: {
                deliveryTag: 1,
                redelivered: false,
                consumerTag: 'amqp1234',
                exchange: 'testexchange',
                messageCount: 100,
                routingKey: 'item.created'
            }
        };
    });
    const consumerMock = {
        ack: (message: HaredoMessage) => {},
        nack: (message: HaredoMessage) => {}
    } as Partial<Consumer> as Consumer;
    it('should parse json when parseJson is true', () => {
        const message = new HaredoMessage(messageMock, true, consumerMock);
        expect(message.data).to.eql({});
    });
    it('should not parse json when parseJson is false', () => {
        const message = new HaredoMessage(messageMock, false, consumerMock);
        expect(message.data).to.eql('{}');
    });
    it('should throw if json is not parsable', () => {
        const fn = () => new HaredoMessage(Object.assign({}, messageMock, { content: Buffer.from('{') }), true, consumerMock);
        expect(fn).to.throw();
    });
    it('should return headers from getHeaders()', () => {
        const message = new HaredoMessage(messageMock, false, consumerMock);
        expect(message.getHeaders()).to.eql({ 'x-delay': 5000 });
    });
    it('should coerce to string', () => {
        const message = new HaredoMessage(messageMock, false, consumerMock);
        expect(message.toString()).to.eql('HaredoMessage {}');
    });
    describe('ack', () => {
        it('should throw an error when ack is called twice', () => {
            const message = new HaredoMessage(messageMock, false, consumerMock);
            const fn = () => message.ack();
            fn();
            expect(fn).to.throw(MessageAlreadyHandledError);
        });
    });
    describe('nack', () => {
        it('should throw an error when nack is called twice', () => {
            const message = new HaredoMessage(messageMock, false, consumerMock);
            const fn = () => message.nack();
            fn();
            expect(fn).to.throw(MessageAlreadyHandledError);
        });
    });
});
