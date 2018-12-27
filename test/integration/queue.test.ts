import 'mocha';
import { Queue, Haredo } from '../../src/index'
import {
    setup,
    teardown,
    verifyQueue,
    getChannel,
    getSingleMessage,
    publishMessage,
    purgeQueue
} from './helpers/amqp';
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
        const queue = new Queue(queueName).durable();
        await haredo.queue(queue).setup();
        await verifyQueue(queueName, { durable: true });
    });
    it('should publish to queue', async () => {
        const queueName = 'simplequeue';
        interface SimpleMessage {
            test: number;
        }
        const queue = new Queue<SimpleMessage>(queueName).durable();
        await haredo.queue(queue).publish({ test: 1 });
        await getSingleMessage(queue.name);
    });
    describe('methods', () => {
        it('should assert the queue', async () => {
            const queue = new Queue('simpleQueue').durable();
            await queue.assert(getChannel);
            await verifyQueue(queue.name, { durable: true });
        });
        it('should purge the queue', async () => {
            const queue = new Queue('simpleQueue').durable();
            await queue.assert(getChannel);
            await publishMessage(queue.name, { test: 1 }, {});
            await queue.purge(getChannel);
            expect(await purgeQueue(queue.name)).to.equal(0);
        });
        it('should delete the queue', async () => {
            const queue = new Queue('simpleQueue').durable();
            await queue.assert(getChannel);
            await queue.delete(getChannel);
            await expect(verifyQueue(queue.name)).to.eventually.rejectedWith(/NOT_FOUND/);
        });
        it('should force assert the queue', async () => {
            const queue = new Queue('simpleQueue').durable();
            await queue.assert(getChannel);
            const newQueue = queue.durable(false);
            await expect(newQueue.assert(getChannel)).to.eventually.be.rejectedWith(/PRECONDITION_FAILED/);
            await newQueue.assert(getChannel, true);
        });
        it('should set autodelete', () => {
            const queue = new Queue().autoDelete();
            expect(queue.opts.autoDelete).to.be.true;
        });
        it('should set exclusive', () => {
            const queue = new Queue().exclusive();
            expect(queue.opts.exclusive).to.be.true;
        });
        it('should set messageTtl', () => {
            const queue = new Queue().messageTtl(100);
            expect(queue.opts.messageTtl).to.eql(100);
        });
        it('should set expires', () => {
            const queue = new Queue().expires(100);
            expect(queue.opts.expires).to.eql(100);
        });
        it('should stringify', () => {
            const queue = new Queue();
            expect(queue.toString()).to.eqls('Queue opts:durable=true,exclusive=false');
        });
        it('should clone', () => {
            const queue = new Queue();
            const queue2 = queue.clone();
            expect(queue).to.not.equal(queue2);
        });
    });

});
