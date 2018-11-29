import { FailHandler } from '../src/fail-handler';

import { expect } from 'chai';

describe('FailHandler', () => {
    it('should get a ticket', async () => {
        const failHandler = new FailHandler({
            failSpan: 5000,
            failTimeout: 5000,
            failThreshold: 5
        });

        await failHandler.getTicket();
        failHandler.fail();
        await failHandler.getTicket();
    }).timeout(50);
    it('should delay a ticket if failThreshold is exceeded', async () => {
        const failHandler = new FailHandler({
            failSpan: 5000,
            failTimeout: 100,
            failThreshold: 1
        });

        await failHandler.getTicket();
        failHandler.fail();
        expect(failHandler.ready).to.be.false;
        try {
            await Promise.race([failHandler.getTicket(), timeout(70)]);
            throw new Error('Timeout was not reached');
        } catch (e) {
            expect(e).to.be.instanceof(TimeoutError);
        }
        await failHandler.getTicket();
        expect(failHandler.ready).to.be.true;
    }).timeout(200);
});

class TimeoutError extends Error { }

function timeout(milliseconds: number) {
    return new Promise((resolve, reject) => {
        setTimeout(reject, milliseconds, new TimeoutError());
    });
}

function delay(milliseconds: number) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}
