import { expect } from 'hein';
import { makeHaredoMessage } from './haredo-message';
import { SinonSpy, spy } from 'sinon';
import { HaredoMessage } from './types';
describe('HaredoMessage', () => {
    let message: HaredoMessage<any>;
    let nackSpy: SinonSpy;
    let ackSpy: SinonSpy;

    beforeEach(() => {
        nackSpy = spy();
        ackSpy = spy();
        message = makeHaredoMessage(
            {
                bodyString: () => '{"hello": "world"}',
                properties: {
                    headers: {
                        'x-cid': '123456'
                    }
                },
                nack: nackSpy,
                ack: ackSpy
            } as any,
            true,
            'testQueue'
        );
    });

    it('should return a header on getHeader', async () => {
        expect(message.getHeader('x-cid')).to.eq('123456');
    });

    it('should not call nack twice', async () => {
        await message.nack();
        await message.nack();
        expect(nackSpy).to.have.been.calledOnce();
    });

    it('should not call nack if ack has been called', async () => {
        await message.ack();
        await message.nack();
        expect(nackSpy).to.not.have.been.called();
    });

    it('should not call ack if nack has been called', async () => {
        await message.nack();
        await message.ack();
        expect(ackSpy).to.not.have.been.called();
    });

    it('should return isAcked false if message has been nacked', async () => {
        await message.nack();
        expect(message.isAcked()).to.be.false();
    });

    it('should return isAcked true if message has been acked', async () => {
        await message.ack();
        expect(message.isAcked()).to.be.true();
    });

    it('should return isAcked false if message has not been acked or nacked', async () => {
        expect(message.isAcked()).to.be.false();
    });

    it('should return isNacked false if message has been acked', async () => {
        await message.ack();
        expect(message.isNacked()).to.be.false();
    });

    it('should return isNacked true if message has been nacked', async () => {
        await message.nack();
        expect(message.isNacked()).to.be.true();
    });

    it('should return isNacked false if message has not been acked or nacked', async () => {
        expect(message.isNacked()).to.be.false();
    });

    it('should not throw when calling getHeaders if headers is undefined', async () => {
        message = makeHaredoMessage(
            {
                bodyString: () => '{"hello": "world"}',
                properties: {}
            } as any,
            true,
            'testQueue'
        );
        // eslint-disable-next-line unicorn/no-useless-undefined
        expect(message.getHeader('x-cid')).to.eq(undefined);
    });

    it('should parse expiration', async () => {
        message = makeHaredoMessage(
            {
                bodyString: () => '{"hello": "world"}',
                properties: {
                    expiration: '5000'
                }
            } as any,
            true,
            'testQueue'
        );
        expect(message.expiration).to.eq(5000);
    });

    it('should parse deliveryCount', async () => {
        message = makeHaredoMessage(
            {
                bodyString: () => '{"hello": "world"}',
                properties: {
                    headers: {
                        'x-delivery-count': '1'
                    }
                }
            } as any,
            true,
            'testQueue'
        );
        expect(message.deliveryCount).to.eq(1);
    });
});
