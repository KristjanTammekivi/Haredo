import 'source-map-support/register';
import 'mocha';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { Haredo, Queue } from '../../src/index';
import { setup, teardown, verifyQueue, getSingleMessage } from './helpers/amqp';
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
    interface SimpleMessage {
        test: number;
    }
    it('should publish to queue', async () => {
        const queue = new Queue<SimpleMessage>();
        await haredo.queue(queue).publish({
            test: 5
        });
        await getSingleMessage(queue.name);
    });
    it('should assert as a shorthand queue', async () => {
        const queueName = 'test';
        await haredo.queue(queueName).setup();
        await verifyQueue(queueName, { durable: true });
    });
    it('should publish with json taken into account', async () => {
        const queue = new Queue<string>('myqueeu');
        await haredo.queue(queue).json(false).publish('mystring');
        await expect(getSingleMessage(queue.name)).to.eventually.have.property('content', 'mystring');
        await haredo.queue(queue).json().publish('mystring');
        await expect(getSingleMessage(queue.name)).to.eventually.have.property('content', '"mystring"');
    });
});
