import { expect } from 'chai';
import { FailHandler } from '../../src/fail-handler';
import { TimeoutError, timeout } from '../../src/utils';

describe.only('FailHandler', () => {
    it('should get a ticket', async () => {
        const failHandler = new FailHandler({
            failSpan: 5000,
            failTimeout: 5000,
            failThreshold: 5
        });

        await failHandler.getTicket();
        failHandler.fail();
        await failHandler.getTicket();
        failHandler.fail();
    }).timeout(50);
    it('should delay a ticket if failThreshold is exceeded', async () => {
        const failHandler = new FailHandler({
            failSpan: 5000,
            failTimeout: 100,
            failThreshold: 1
        });

        await failHandler.getTicket();
        failHandler.fail();
        expect(failHandler.failUntil).to.be.greaterThan(new Date().getTime());
        try {
            await Promise.race([failHandler.getTicket(), timeout(90)]);
            throw new Error('Timeout was not reached');
        } catch (e) {
            expect(e).to.be.instanceof(TimeoutError);
        }
        await failHandler.getTicket();
        expect(failHandler.failUntil).to.be.lessThan(new Date().getTime());
        failHandler.clear()
    }).timeout(200);
});

