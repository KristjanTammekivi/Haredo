import 'mocha';
import { Queue, Haredo } from '../../src/index'
import {
    setup,
    teardown,
    getSingleMessage
} from './helpers/amqp';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { delay } from 'bluebird';
import { Consumer } from '../../src/consumer';
import { eventToPromise } from '../../src/utils';

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
    describe('autoAck', () => {
        it('should ack a message when callback is resolved', async () => {
            const haredo = new Haredo({
                connectionOptions: 'amqp://guest:guest@localhost:5672/test',
                autoAck: true
            });
            await haredo.connect();
            const queue = new Queue<{ test: number }>('simpleQueue').durable();
            await haredo.queue(queue).publish({ test: 1 });
            const consumer = await haredo.queue(queue).subscribe(async message => { });
            await delay(50);
            await consumer.cancel();
            await expect(getSingleMessage(queue.name)).to.eventually.be.rejectedWith(/No message/);
        });
        it('should nack a message when callback throws', async () => {
            const haredo = new Haredo({
                connectionOptions: 'amqp://guest:guest@localhost:5672/test',
                autoAck: true
            });
            await haredo.connect();
            const queue = new Queue<{ test: number }>('simpleQueue').durable();
            await haredo.queue(queue).publish({ test: 1 });
            const consumer = await haredo.queue(queue).subscribe(async message => {
                throw new Error('test');
            });
            await delay(50);
            await consumer.cancel();
            await getSingleMessage(queue.name);
        });
    });
    describe('cancel', () => {
        it('should close channel', async () => {
            const queue = new Queue<{ test: number }>('simpleQueue').durable();
            const consumer = await haredo.queue(queue).subscribe(async message => {
                await message.ack();
            });
            const channelClosedPromise = channelHasClosedPromise(consumer);
            await consumer.cancel();
            await expect(channelClosedPromise).to.eventually.eql(undefined);
        });
        it('should wait for messages to be acked before closing channel', async () => {
            const queue = new Queue<{ test: number }>('simpleQueue').durable();
            await haredo.queue(queue).publish({ test: 5 });
            let messageWasHandled = false;
            const consumer = await haredo.queue(queue).subscribe(async message => {
                await delay(50);
                await message.ack();
                messageWasHandled = true;
            });
            const channelClosedPromise = channelHasClosedPromise(consumer);
            await consumer.cancel();
            await expect(channelClosedPromise).to.eventually.eql(undefined);
            expect(messageWasHandled).to.be.true;
        });
        it('should force close', async () => {
            const queue = new Queue('simpleQueue').durable();
            await haredo.queue(queue).publish({ test: 1 })
            const consumer = await haredo.queue(queue).subscribe(async (message) => {
                await delay(200);
                await message.ack();
            });
            const closePromise = consumer.cancel();
            await eventToPromise(consumer.emitter, 'cancel');
            const forceClosePromise = consumer.cancel(true);
            await Promise.all([
                expect(closePromise).to.eventually.equal(undefined),
                expect(forceClosePromise).to.eventually.equal(undefined)
            ]);
        });
    });
    describe('prefetch', () => {
        it('should set prefetch for consumer', async () => {
            const queue = new Queue();
            const consumer = await haredo.queue(queue).prefetch(5).subscribe(() => {

            });
            expect(consumer).to.have.property('prefetch', 5);
            await consumer.setPrefetch(10);
            expect(consumer).to.have.property('prefetch', 10);
        });
    });
    describe('message', () => {
        it('should reject when trying to ack a handled message', async () => {
            const queue = new Queue<{ test: number }>('simpleQueue').durable();
            let didThrow = false;
            await haredo.queue(queue).publish({ test: 5 });
            const consumer = await haredo.queue(queue).subscribe(async message => {
                await message.ack();
                try {
                    await message.ack();
                } catch (e) {
                    didThrow = true;
                }
            });
            await consumer.cancel();
            expect(didThrow).to.be.true;
        });
        it('should reject when trying to nack a handled message', async () => {
            const queue = new Queue<{ test: number }>('simpleQueue').durable();
            let didThrow = false;
            await haredo.queue(queue).publish({ test: 5 });
            const consumer = await haredo.queue(queue).subscribe(async message => {
                await message.nack();
                try {
                    await message.nack();
                } catch (e) {
                    didThrow = true;
                }
            });
            await consumer.cancel();
            expect(didThrow).to.be.true;
        });
    })

    function channelHasClosedPromise(consumer: Consumer) {
        return new Promise((resolve) => {
            consumer.channel.once('close', () => {
                resolve();
            });
        });
    }

});
