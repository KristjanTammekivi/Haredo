import { expect } from 'hein';
import { standardBackoff } from './backoffs';
import { delay } from './utils/delay';

describe('backoffs', () => {
    describe('standardBackoff', () => {
        it('should provide tickets', async () => {
            const backoff = standardBackoff();
            await backoff.take();
        });

        it('should halt after failThreshold', async () => {
            const backoff = standardBackoff({ failThreshold: 3, failTimeout: 20 });
            backoff.nack(true);
            backoff.nack(true);
            backoff.nack(true);
            let isTaken = false;
            void backoff.take().then(() => {
                isTaken = true;
            });
            await delay(10);
            expect(isTaken).to.be.false();
        });

        it('should not halt when requeue is false', async () => {
            const backoff = standardBackoff({ failThreshold: 3, failTimeout: 20 });
            backoff.nack(false);
            backoff.nack(false);
            backoff.nack(false);
            let isTaken = false;
            void backoff.take().then(() => {
                isTaken = true;
            });
            await delay(10);
            expect(isTaken).to.be.true();
        });
    });
});
