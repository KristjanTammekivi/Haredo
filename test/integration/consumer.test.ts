import 'source-map-support/register';
import 'mocha';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
use(chaiAsPromised);

import { Haredo } from '../../src';
import { setup, teardown } from './helpers/amqp';
import { EventEmitter } from 'events';
import { delay } from '../../src/utils';

describe('Consumer', () => {
    let haredo: Haredo;
    beforeEach(async () => {
        await setup();
        haredo = new Haredo({
            connection: 'amqp://guest:guest@localhost:5672/test',
            reconnect: true
        });
        await haredo.connect();
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
            const consumer = await haredo.queue('test').subscribe(async (data, message) => {
                await delay(100);
                messageWasHandled = true;
                await message.ack();
            });
            const channelClosedPromise = eventToPromise(consumer.channel, 'close');
            consumer.cancel();
            await expect(channelClosedPromise).to.eventually.be.fulfilled;
            expect(messageWasHandled).to.be.true;
        });
    });
    describe('reestablish', () => {
        it('should reestablish on channel close when reestablish is set', async () => {
            let messageWasHandled = false;
            const consumer = await haredo
                .queue('test')
                .reestablish()
                .subscribe(() => {
                    messageWasHandled = true;
                });
            await consumer.channel.close();
            await haredo.queue('test').publish({});
            await delay(50);
            await consumer.cancel();
            expect(messageWasHandled).to.be.true;
        });
        it('should not reestablish on channel close when reestablish is not set', async () => {
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
            expect(messageWasHandled).to.be.false;
        });
    });
});

export const eventToPromise = (emitter: EventEmitter, event: string) => {
    return new Promise((resolve) => {
        emitter.once(event, () => {
            resolve();
        });
    });
};
