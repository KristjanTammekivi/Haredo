import 'mocha';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { Haredo, Queue } from '../../src/index';
import { setup, teardown, verifyQueue } from './helpers/amqp';
use(chaiAsPromised);

describe('Queue', () => {
    let haredo: Haredo
    beforeEach(async () => {
        await setup();
        haredo = new Haredo({
            connection: 'amqp://guest:guest@localhost:5672/test'
        });
        await haredo.connect();
    });
    afterEach(async () => {
        await haredo.close();
        await teardown();
    });
    it('should declare a simple queue', async () => {
        const queueName = 'simpleQueue';
        const queue = new Queue(queueName);
        await haredo.queue(queue).setup();
        await verifyQueue(queueName, { durable: true });
    });
    it('should acquire a name during an anonymous queue', async () => {
        const queue = new Queue('');
        await haredo.queue(queue).setup();
        expect(queue.name).length.greaterThan(0);
    });
});
