import { expect } from 'hein';
import { spy } from 'sinon';
import { HaredoMessage, makeHaredoMessage } from '../haredo-message';
import { applyMiddleware } from './apply-middleware';
import { delay } from './delay';

describe('applyMiddleware', () => {
    let message: HaredoMessage<any>;
    beforeEach(() => {
        message = makeHaredoMessage(
            {
                bodyString: () => '{"hello": "world"}',
                properties: {},
                nack: async () => {},
                ack: async () => {}
            } as any,
            true,
            'testQueue'
        );
    });

    it('should call the callback if there are no middleware', async () => {
        const callback = spy();
        await applyMiddleware([], callback, message);
        expect(callback).to.have.been.calledOnce();
        expect(callback).to.have.been.calledWith(message.data, message);
    });
    it('should call the middleware', async () => {
        const middleware = spy();
        const callback = spy();
        await applyMiddleware([middleware], callback, message);
        expect(middleware.calledOnce).to.be.true();
        expect(middleware).to.have.been.calledWith(message);
    });
    it('should call middleware before the callback', async () => {
        const middleware = spy();
        const callback = spy();
        await applyMiddleware([middleware], callback, message);
        expect(middleware).to.have.been.calledBefore(callback);
    });
    it('should call second middleware after first one', async () => {
        const middleware1 = spy();
        const middleware2 = spy();
        const callback = spy();
        await applyMiddleware([middleware1, middleware2], callback, message);
        expect(middleware1).to.have.been.calledBefore(middleware2);
    });
    it('should not call second middleware before first one if first one is awaiting on promise', async () => {
        let firstMiddlewareFinishedAt: Date;
        let secondMiddlewareCalledAt: Date;
        const middleware1 = spy(async () => {
            await delay(4);
            firstMiddlewareFinishedAt = new Date();
        });
        const middleware2 = spy(async () => {
            await delay(2);
            secondMiddlewareCalledAt = new Date();
        });
        const callback = spy();
        await applyMiddleware([middleware1, middleware2], callback, message);
        expect(firstMiddlewareFinishedAt!).to.not.be.undefined();
        expect(firstMiddlewareFinishedAt!).to.be.before(secondMiddlewareCalledAt!);
    });
    it('should reject first middleware if second middleware throws', async () => {
        const middleware1 = spy(async (_message, next) => {
            await next();
        });
        const error = new Error('test');
        const middleware2 = spy(() => {
            throw error;
        });
        const callback = spy();
        await expect(applyMiddleware([middleware1 as any, middleware2], callback, message)).to.reject(/test/);
        await expect(middleware1.firstCall.returnValue).to.reject(/test/);
    });
    it('should not call callback if middleware nacks and calls next', async () => {
        const middleware = spy(async (message_, next) => {
            console.log(message_);
            await message_.nack();
            await next();
        });
        const callback = spy();
        await applyMiddleware([middleware], callback, message);
        expect(callback).to.not.have.been.called();
    });
});
