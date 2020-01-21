import { wrappedChannelGetter, wrapChannel } from '../../src/publisher'
import { stub } from 'sinon';
import { EventEmitter } from 'events';
import { expect } from 'chai';
import { makeTicketMachine } from '../../src/utils';

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
        it('should let ticketmachine play on publish drain', async () => {
            const channelMock = new EventEmitter() as any;
            const ticketMachineStub = stub(makeTicketMachine());
            ticketMachineStub.take.returns((() => {}) as any);
            channelMock.publish = stub().returns(false);
            const wrapper = wrapChannel(channelMock as any, false, { debug: () => {} } as any, ticketMachineStub);
            await wrapper.publishToExchange('test', 'x', Buffer.from('test'), {} as any);
            expect(ticketMachineStub.pause).to.have.been.calledOnce;
            channelMock.emit('drain');
            expect(ticketMachineStub.play).to.have.been.calledOnce;
        });
        it('should let ticketmachine play on sendToQueue drain', async () => {
            const channelMock = new EventEmitter() as any;
            const ticketMachineStub = stub(makeTicketMachine());
            ticketMachineStub.take.returns((() => {}) as any);
            channelMock.sendToQueue = stub().returns(false);
            const wrapper = wrapChannel(channelMock as any, false, { debug: () => {} } as any, ticketMachineStub);
            await wrapper.sendToQueue('test', Buffer.from('test'), {} as any);
            expect(ticketMachineStub.pause).to.have.been.calledOnce;
            channelMock.emit('drain');
            expect(ticketMachineStub.play).to.have.been.calledOnce;
        });
        it('should let ticketmachine play on publish confirm drain', async () => {
            const channelMock = new EventEmitter() as any;
            const ticketMachineStub = stub(makeTicketMachine());
            ticketMachineStub.take.returns((() => {}) as any);
            channelMock.publish = stub().returns(false).callsArg(4).returns(false);
            const wrapper = wrapChannel(channelMock as any, true, { debug: () => {} } as any, ticketMachineStub);
            await wrapper.publishToExchange('test', 'x', Buffer.from('test'), {} as any);
            expect(ticketMachineStub.pause).to.have.been.calledOnce;
            channelMock.emit('drain');
            expect(ticketMachineStub.play).to.have.been.calledOnce;
        });
        it('should let ticketmachine play on ssendToQueue confirm drain', async () => {
            const channelMock = new EventEmitter() as any;
            const ticketMachineStub = stub(makeTicketMachine());
            ticketMachineStub.take.returns((() => {}) as any);
            channelMock.sendToQueue = stub().returns(false).callsArg(3).returns(false);
            const wrapper = wrapChannel(channelMock as any, true, { debug: () => {} } as any, ticketMachineStub);
            await wrapper.sendToQueue('test', Buffer.from('test'), {} as any);
            expect(ticketMachineStub.pause).to.have.been.calledOnce;
            channelMock.emit('drain');
            expect(ticketMachineStub.play).to.have.been.calledOnce;
        });
        it('should reject when confirm publish calls back with error', async () => {
            const channelMock = new EventEmitter() as any;
            const ticketMachineStub = stub(makeTicketMachine());
            ticketMachineStub.take.returns((() => {}) as any);
            channelMock.publish = stub().callsArgWith(4, new Error('somethingwrong')).returns(false);
            const wrapper = wrapChannel(channelMock as any, true, { debug: () => {} } as any);
            await expect(wrapper.publishToExchange('test', 'test', Buffer.from('test'), {} as any)).to.be.rejectedWith('somethingwrong');
        });
        it('should reject when confirm sendToQueue calls back with error', async () => {
            const channelMock = new EventEmitter() as any;
            const ticketMachineStub = stub(makeTicketMachine());
            ticketMachineStub.take.returns((() => {}) as any);
            channelMock.sendToQueue = stub().callsArgWith(3, new Error('somethingwrong')).returns(false);
            const wrapper = wrapChannel(channelMock as any, true, { debug: () => {} } as any);
            await expect(wrapper.sendToQueue('test', Buffer.from('test'), {} as any)).to.be.rejectedWith('somethingwrong');
        });
    });
});