import 'mocha';
import { Queue, Haredo } from '../../src/index'
import { setup, teardown, checkQueue, getChannel, getSingleMessage, publishMessage, purgeQueue } from './helpers/amqp';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

describe('Queue', () => {
    let haredo: Haredo;
    beforeEach(async () => {
        await setup();
        haredo = new Haredo({
            connectionOptions: 'amqp://guest:guest@localhost:5672/test',
            autoAck: false
        });
        await haredo.connect();
    });
    afterEach(async () => {
        await haredo.close();
        await teardown();
    });
    it('should declare a simple queue', async () => {
        const queueName = 'simplequeue';
        const queue = new Queue(queueName, { durable: true });
        await haredo.queue(queue).setup();
        await checkQueue(queueName, { durable: true });
    });
    it('should publish to queue', async () => {
        const queueName = 'simplequeue';
        interface SimpleMessage {
            test: number;
        }
        const queue = new Queue<SimpleMessage>(queueName, { durable: true });
        await haredo.queue(queue).publish({ test: 1 });
        await getSingleMessage(queue.name);
    });
    describe('methods', () => {
        it('should assert the queue', async () => {
            const queue = new Queue('simpleQueue', { durable: true });
            await queue.assert(getChannel);
            await checkQueue(queue.name, { durable: true });
        });
        it('should purge the queue', async () => {
            const queue = new Queue('simpleQueue');
            await queue.assert(getChannel);
            await publishMessage(queue.name, { test: 1 }, {});
            await queue.purge(getChannel);
            expect(await purgeQueue(queue.name)).to.equal(0);
        });
        it('should delete the queue', async () => {
            const queue = new Queue('simpleQueue');
            await queue.assert(getChannel);
            await queue.delete(getChannel);
            await expect(checkQueue(queue.name)).to.eventually.rejectedWith(/NOT_FOUND/);
        });
    });

});
