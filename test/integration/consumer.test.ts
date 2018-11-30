import 'mocha';
import { Queue, Haredo } from '../../src/index'
import {
    setup,
    teardown
} from './helpers/amqp';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { delay } from 'bluebird';
import { Consumer } from '../../src/consumer';

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
    describe('cancel', () => {
        it('should close channel', async () => {
            const queue = new Queue<{ test: number }>('simpleQueue', { durable: true });
            const consumer = await haredo.queue(queue).subscribe(async message => {
                await message.ack();
            });
            const channelClosedPromise = channelHasClosedPromise(consumer);
            await consumer.cancel();
            await expect(channelClosedPromise).to.eventually.eql(undefined);
        });
        it('should wait for messages to be acked before closing channel', async () => {
            const queue = new Queue<{ test: number }>('simpleQueue', { durable: true });
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
    });

    function channelHasClosedPromise(consumer: Consumer) {
        return new Promise((resolve) => {
            consumer.channel.once('close', () => {
                resolve();
            });
        });
    }

});
