import 'source-map-support/register';
import 'mocha';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
use(chaiAsPromised);

import { Haredo, Queue } from '../../src';
import { setup, teardown } from './helpers/amqp';
import { EventEmitter } from 'events';
import { delay } from '../../src/utils';
import { Connection } from 'amqplib';

describe('Consumer', () => {
    let haredo: Haredo;
    let connection: Connection;
    beforeEach(async () => {
        await setup();
        haredo = new Haredo({
            connection: 'amqp://guest:guest@localhost:5672/test',
            reconnect: true
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
});

export const eventToPromise = (emitter: EventEmitter, event: string) => {
    return new Promise((resolve) => {
        emitter.once(event, () => {
            resolve();
        });
    });
};
