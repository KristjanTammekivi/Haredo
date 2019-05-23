import 'mocha';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
use(chaiAsPromised);

import { Haredo } from '../../src';
import { setup, teardown } from './helpers/amqp';
import { EventEmitter } from 'events';
import { delay } from 'bluebird';

describe('Consumer', () => {
    let haredo: Haredo;
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
    describe('cancel', () => {
        it('should close channel', async () => {
            const consumer = await haredo.queue('test').subscribe(async (message) => {
                await message.ack();
            });
            const channelClosedPromise = eventToPromise(consumer.channel, 'close');
            await consumer.cancel();
            await expect(channelClosedPromise).to.eventually.be.fulfilled;
        });
        it('should wait for messages to be acked before closing channel', async () => {
            await haredo.queue('test').publish('test');
            let messageWasHandled = false;
            const consumer = await haredo.queue('test').subscribe(async message => {
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
});

export const eventToPromise = (emitter: EventEmitter, event: string) => {
    return new Promise((resolve) => {
        emitter.once(event, () => {
            resolve();
        });
    });
};
