import 'mocha';
import { expect } from 'chai';
import { MessageManager, HaredoMessage } from '../../src';
import { delay, timeout } from '../../src/utils';

describe('Unit: MessageManager', () => {
    let message: HaredoMessage;
    let messageManager: MessageManager;
    beforeEach(() => {
        messageManager = new MessageManager();
        message = new HaredoMessage({
            content: Buffer.from(''),
            properties: {}
        } as any, false, {} as any);
    });
    it('should return length', () => {
        expect(messageManager).to.have.property('length', 0);
        messageManager.add(message);
        expect(messageManager).to.have.property('length', 1);
    });
    it('should return proper value for isDrained', () => {
        expect(messageManager.isDrained()).to.equal(true);
        messageManager.add(message);
        expect(messageManager.isDrained()).to.equal(false);
    });
    it('should remove message when handled event is emitted', () => {
        messageManager.add(message);
        message.emitter.emit('handled');
        expect(messageManager.isDrained()).to.equal(true);
    });
    it('should resolve drain promise once messages are cleared', async () => {
        messageManager.add(message);
        await delay(10);
        const drainPromise = Promise.race([
            timeout(10),
            messageManager.drain(),
            delay(5).then(() => message.emitter.emit('handled'))
        ]);
        await expect(drainPromise).to.eventually.be.fulfilled;
    });
    it('should resolve drain promise when there are no messages', async () => {
        const drainPromise = Promise.race([
            timeout(2),
            messageManager.drain()
        ]);
        await expect(drainPromise).to.eventually.be.fulfilled;
    });
});
