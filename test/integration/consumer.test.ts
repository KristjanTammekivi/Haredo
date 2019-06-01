import 'source-map-support/register';
import 'mocha';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
use(chaiAsPromised);

import { Haredo, Queue } from '../../src';
import { setup, teardown, getSingleMessage } from './helpers/amqp';
import { EventEmitter } from 'events';
import { delay } from '../../src/utils';
import { Connection } from 'amqplib';

describe('Consumer', () => {
    let haredo: Haredo;
    let connection: Connection;
    beforeEach(async () => {
        await setup();
        haredo = new Haredo({
            connection: 'amqp://guest:guest@localhost:5672/test'
        });
        connection = await haredo.connect();
    });
    afterEach(async () => {
        await haredo.close();
        await teardown();
    });
    describe('cancel', () => {
        it('should close channel', async () => {
            const consumer = await haredo.queue('test').subscribe(async (data, message) => {
                await message.ack();
            });
            const channelClosedPromise = eventToPromise(consumer.channel, 'close');
            await consumer.cancel();
            await expect(channelClosedPromise).to.eventually.be.fulfilled;
        });
        it('should wait for messages to be acked before closing channel', async () => {
            await haredo.queue('test').publish('test');
            let messageWasHandled = false;
            const consumer = await haredo.queue('test').reestablish(false).subscribe(async (data, message) => {
                await delay(100);
                messageWasHandled = true;
                await message.ack();
            });
            await delay(20);
            await consumer.cancel();
            expect(messageWasHandled).to.be.true;
        });
    });
    describe('reestablish', () => {
        it('should reestablish on channel close when reestablish is set', async () => {
            let messageWasHandled = false;
            const consumer = await haredo
                .queue('test')
                .subscribe(() => {
                    messageWasHandled = true;
                });
            await consumer.channel.close();
            await haredo.queue('test').publish({});
            await delay(50);
            await consumer.cancel();
            expect(messageWasHandled).to.be.true;
        });
        it('should not reestablish on channel close when reestablish is false', async () => {
            let messageWasHandled = false;
            const consumer = await haredo
                .queue('test')
                .reestablish(false)
                .prefetch(1)
                .subscribe(() => {
                    messageWasHandled = true;
                });
            await consumer.channel.close();
            await haredo.queue('test').publish({});
            await delay(200);
            await consumer.cancel();
            expect(messageWasHandled).to.be.false;
        });
    });
    it('should reconnect when connection gets killed', async () => {
        const queue = new Queue('test');
        let messageHandled = true;
        await haredo.queue(queue).subscribe(msg => {
            messageHandled = true;
        });
        await connection.close();
        await delay(50);
        await haredo.queue(queue).publish('message');
        await delay(50);
        expect(messageHandled).to.be.true;
    });
    describe('autoAck', () => {
        it('should requeue a message when promise rejects', async () => {
            const queue = new Queue('test');
            await haredo.queue(queue).publish('test');
            let messageReceived = false;
            const consumer = await haredo.queue(queue).subscribe(async (msg) => {
                messageReceived = true;
                throw new Error('whoops');
            });
            await delay(20);
            await consumer.cancel();
            expect(messageReceived).to.be.true;
            await expect(getSingleMessage(queue.name)).to.eventually.be.fulfilled;
        });
    });
    it('should not requeue if failing to parse json', async () => {

    });
});

export const eventToPromise = (emitter: EventEmitter, event: string) => {
    return new Promise((resolve) => {
        emitter.once(event, () => {
            resolve();
        });
    });
};
