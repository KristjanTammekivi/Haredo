import { wrappedChannelGetter } from '../../src/publisher'
import { stub } from 'sinon';
import { EventEmitter } from 'events';
import { expect } from 'chai';

const noop = () => {};

describe('Unit/Publisher', () => {
    describe('wrappedChannelGetter', () => {
        it('should call channelGetter once', () => {
            const s = stub();
            const emitter = new EventEmitter();
            s.returns(emitter)
            const getter = wrappedChannelGetter(s, { info: noop } as any, false);
            getter();
            getter();
            expect(s).to.be.calledOnce;
        });
    });
});