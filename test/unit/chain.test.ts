import 'mocha';

import { initialChain, queueChain, InitialChain, QueueChain } from '../../src/haredo';
import { expect } from 'chai';
import { Middleware, HaredoChainState } from '../../src/state';
import { stub } from 'sinon';
import { EventEmitter } from 'events';

describe('unit/chain', () => {
    let chain: InitialChain<unknown, unknown>;
    beforeEach(() => {
        chain = initialChain({});
    })
    it('Should have base methods', () => {
        chain = initialChain({});
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
    it('should set autoAck', () => {
        expect(chain.queue('test').autoAck().getState()).to.have.property('autoAck' as keyof HaredoChainState, true);
        expect(chain.queue('test').autoAck(false).getState()).to.have.property('autoAck' as keyof HaredoChainState, false);
    });
    it('should set autoReply', () => {
        expect(chain.queue('test').autoReply().getState()).to.have.property('autoReply' as keyof HaredoChainState, true);
        expect(chain.queue('test').autoReply(false).getState()).to.have.property('autoReply' as keyof HaredoChainState, false);
    });
    it('should set confirm', () => {
        expect(chain.queue('test').confirm().getState()).to.have.property('confirm' as keyof HaredoChainState, true);
        expect(chain.queue('test').confirm(false).getState()).to.have.property('confirm' as keyof HaredoChainState, false);
    });
    it('should set confirm', () => {
        expect(chain.exchange('test', 'direct').getState().exchange.name).to.equal('test');
        expect(chain.exchange('test', 'direct').getState().exchange.type).to.equal('direct');
    });
    it('should set prefetch', () => {
        expect(chain.queue('test').prefetch(5).getState()).to.have.property('prefetch' as keyof HaredoChainState, 5);
    });
    it('should set reestablish', () => {
        expect(chain.queue('test').reestablish().getState()).to.have.property('reestablish' as keyof HaredoChainState, true);
        expect(chain.queue('test').reestablish(false).getState()).to.have.property('reestablish' as keyof HaredoChainState, false);
    });
    it('should set failSpan', () => {
        expect(chain.queue('test').failSpan(1234).getState()).to.have.property('failSpan' as keyof HaredoChainState, 1234);
    });
    it('should set failThreshold', () => {
        expect(chain.queue('test').failThreshold(1234).getState()).to.have.property('failThreshold' as keyof HaredoChainState, 1234);
    });
    it('should set failTimeout', () => {
        expect(chain.queue('test').failTimeout(1234).getState()).to.have.property('failTimeout' as keyof HaredoChainState, 1234);
    });
    it('should set priority', () => {
        expect(chain.queue('test').priority(1234).getState()).to.have.property('priority' as keyof HaredoChainState, 1234);
    });
    it('should set reestablish', () => {
        expect(chain.queue('test').exclusive().getState()).to.have.property('exclusive' as keyof HaredoChainState, true);
        expect(chain.queue('test').exclusive(false).getState()).to.have.property('exclusive' as keyof HaredoChainState, false);
    });
    it('should set json', () => {
        expect(chain.queue('test').json().getState()).to.have.property('json' as keyof HaredoChainState, true);
        expect(chain.queue('test').json(false).getState()).to.have.property('json' as keyof HaredoChainState, false);
    });
});
