import { expect } from 'chai';
import { delay, TicketMachine, makeTicketMachine } from '../../src/utils';
import { expectFail } from '../integration/consumer.test';

describe('unit/ticketMachine', () => {
    let tm: TicketMachine;
    beforeEach(() => {
        tm = makeTicketMachine();
    });
    it('should resolve with a ticket', async () => {
        expect(await tm.take()).to.be.a('function');
    });
    it('should not allow two tickets at the same time', async () => {
        let ticket1: Function;
        let ticket2: Function;
        tm.take().then(x => ticket1 = x);
        tm.take().then(x => ticket2 = x);
        await delay(10);
        expect(ticket1).to.be.a('function');
        expect(ticket2).to.be.undefined;
        ticket1();
        await delay(2);
        expect(ticket2).to.be.a('function');
    });
    it('should not resolve with a ticket while ticket machine is paused', async () => {
        tm.pause();
        let ticket: Function;
        tm.take().then(x => ticket = x);
        await delay(10);
        expect(ticket).to.be.undefined;
        tm.play();
        await delay(2);
        expect(ticket).to.be.a('function');
    });
    it('should reject all pending tickets if stop is called', async () => {
        await tm.take();
        const ticket2promise = tm.take();
        tm.stop();
        await expectFail(ticket2promise);
    });
});