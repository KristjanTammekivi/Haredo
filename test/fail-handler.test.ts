import 'source-map-support/register';

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
    });
    it('should delay a ticket if failThreshold is exceeded', async () => {
        const failHandler = new FailHandler({
            failSpan: 5000,
            failTimeout: 5000,
            failThreshold: 1
        });

        await failHandler.getTicket();
        failHandler.fail();
        expect(failHandler.ready).to.be.false;
    });
});
