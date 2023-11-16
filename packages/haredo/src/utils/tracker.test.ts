import { expect } from 'hein';
import { createTracker } from './tracker';
import { delay } from './delay';

describe('tracker', () => {
    it('should resolve wait immediately when no messages are in flight', async () => {
        const tracker = createTracker();
        const startTime = Date.now();
        await tracker.wait();
        expect(Date.now() - startTime).to.be.lessThan(2);
    });
    it('should resolve wait immediately when all messages are handled', async () => {
        const tracker = createTracker();
        tracker.inc();
        tracker.dec();
        const startTime = Date.now();
        await tracker.wait();
        expect(Date.now() - startTime).to.be.lessThan(2);
    });
    it('should wait for messages to be handled', async () => {
        const tracker = createTracker();
        tracker.inc();
        tracker.inc();
        let resolved = false;
        void tracker.wait().then(() => {
            resolved = true;
        });
        await delay(10);
        expect(resolved).to.be.false();
        tracker.dec();
        await delay(10);
        tracker.dec();
        await delay(2);
        expect(resolved).to.be.true();
    });
});
