import 'mocha';

import { initialChain, queueChain } from '../../src/haredo';
import { expect } from 'chai';
import { Middleware } from '../../src/state';
import { stub } from 'sinon';
import { EventEmitter } from 'events';

describe('unit/chain', () => {
    it('Should have base methods', () => {
        const chain = initialChain({});
        const props = ['exchange', 'queue'] as (keyof typeof chain)[];
        props.forEach(prop => {
            expect(chain).to.have.property(prop);
        });
    });
    it('should concatenate middleware arrays on multiple .use calls', () => {
        const middleware: Middleware<unknown, unknown>[] = [
            function test1() {},
            function test2() {},
        ];
        const chain = queueChain({}).use(middleware[0]).use(middleware[1]);
        expect(chain.getState().middleware).to.eql(middleware);
    });
    it('should publish via confirm channel', async () => {
        const noop = async () => {};
        const getMock = () => Object.assign(new EventEmitter, { close: noop, assertQueue: noop, sendToQueue: noop });
        const getConfirmChannelStub = stub().resolves(getMock());
        const chain = initialChain({ connectionManager: { getChannel: stub().resolves(getMock()), getConfirmChannel: getConfirmChannelStub } as any});
        await chain.queue('test').confirm(true).skipSetup(true).publish('test');
        expect(getConfirmChannelStub).to.be.calledOnce;
    });
});
