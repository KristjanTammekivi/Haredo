import { makeHaredoMessage } from '../../src/haredo-message';
import { Message } from 'amqplib';
import { expect } from 'chai';
import { spy } from 'sinon';

describe('HaredoMessage', () => {
    let raw: Message;
    beforeEach(() => {
        raw = {
            content: Buffer.from(JSON.stringify({})),
            fields: {} as any,
            properties: {
                headers: {
                    'x-test': 'yup'
                }
            } as any
        };
    });
    it('should get header', () => {
        const { getHeader } = makeHaredoMessage(raw, true, 'testqueue', {} as any);
        expect(getHeader('x-test')).to.equal('yup');
    });
    it('should ack', () => {
        const ackSpy = spy();
        const { ack, isAcked, isHandled } = makeHaredoMessage(raw, true, 'testqueue', { ack: ackSpy } as any);
        ack();
        expect(isAcked()).to.be.true;
        expect(isHandled()).to.be.true;
        expect(ackSpy).to.be.calledOnce;
    });
    it('should nack', () => {
        const nackSpy = spy();
        const { nack, isNacked, isHandled } = makeHaredoMessage(raw, true, 'testqueue', { nack: nackSpy } as any);
        nack();
        expect(isNacked()).to.be.true;
        expect(isHandled()).to.be.true;
        expect(nackSpy).to.be.calledOnce;
    });
    it('should reply', () => {
        const replySpy = spy();
        const { reply, isReplied, getReply } = makeHaredoMessage(raw, true, 'testqueue', { reply: replySpy } as any);
        reply('test');
        expect(isReplied()).to.be.true;
        expect(getReply()).to.equal('test');
    });
    it('should not nack when message is already acked', () => {
        const nackSpy = spy();
        const ackSpy = spy();
        const { ack, nack, isNacked, isAcked } = makeHaredoMessage(raw, true, 'testqueue', { ack: ackSpy, nack: nackSpy } as any);
        ack();
        nack();
        expect(isAcked()).to.be.true;
        expect(isNacked()).to.be.false;
        expect(nackSpy).to.not.be.called;
        expect(ackSpy).to.be.calledOnce;
    });
});