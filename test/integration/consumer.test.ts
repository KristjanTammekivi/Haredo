import 'source-map-support/register';
import 'mocha';
import { expect, use } from 'chai';
import { spy } from 'sinon';

import * as chaiAsPromised from 'chai-as-promised';
use(chaiAsPromised);

import * as sinonChai from 'sinon-chai';
use(sinonChai);

import { Haredo, Queue, Exchange } from '../../src';
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
    it('should clear an anonymous queue name when connection is reestablished', async () => {
        const queue = new Queue('').exclusive();
        expect(queue.isPerishable()).to.be.true;
        await haredo.queue(queue).subscribe(msg => {});
        const originalName = queue.name;
        await delay(50);
        await connection.close();
        await delay(50);
        await haredo.connectionManager.getConnection();
        await delay(50);
        expect(queue.name).to.not.equal('');
        expect(queue.name).to.not.equal(originalName);
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
        const dlx = new Exchange('test.dead', 'fanout');
        const dlq = new Queue('test.dead');
        await haredo.exchange(dlx).queue(dlq).setup();
        const queue = new Queue('test').dead(dlx);
        const consumer = await haredo.queue(queue).subscribe(() => {});
        consumer.emitter.on('error', () => {});
        await haredo.queue(queue).confirm().json(false).publish('{ bad-json');
        await delay(50);
        expect((await getSingleMessage(dlq.name)).content).to.equal('{ bad-json');
    });
    describe('middleware', () => {
        it('should call middleware', async () => {
            const queue = new Queue('test');
            const middlewareFn = spy((msg, next) => {
                return next();
            });
            const fn = spy((data, msg) => {
            });
            await haredo.queue(queue).use(middlewareFn).subscribe(fn);
            await haredo.queue(queue).publish('test');
            await delay(50);
            expect(fn).to.be.calledOnce;
            expect(middlewareFn).to.be.calledOnce;
        });
        it('should wait until callback is finished before moving on with middleware', async () => {
            const queue = new Queue('test');
            let mainFinished = false;
            let resolve: Function;
            let reject: Function;
            const promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
            const middlewareFn = async (msg: any, next: Function) => {
                await next();
                if (mainFinished) {
                    return resolve();
                }
                return reject(new Error('Main callback did not finish before await finished'));
            };
            await haredo.queue(queue).publish('test');
            await haredo.queue(queue).use(middlewareFn).subscribe(async () => {
                await delay(50);
                mainFinished = true;
            });
            await delay(50);
            await expect(promise).to.eventually.be.fulfilled;
        });
        it('should call multiple middleware', async () => {
            const queue = new Queue('test');
            const middlewareFn1 = spy((msg, next) => {
                return next();
            });
            const middlewareFn2 = spy((msg, next) => {
                return next();
            });
            const fn = spy((data, msg) => {});
            await haredo.queue(queue).use(middlewareFn1).use(middlewareFn2).subscribe(fn);
            await haredo.queue(queue).publish('test');
            await delay(50);
            expect(fn).to.be.calledOnce;
            expect(middlewareFn1).to.be.calledOnce;
            expect(middlewareFn2).to.be.calledOnce;
        });
        it('should call next if it was not called during middleware', async () => {
            const queue = new Queue('test');
            const middlewareFn = spy((msg, next) => {
            });
            const fn = spy((data, msg) => {
            });
            await haredo.queue(queue).use(middlewareFn).subscribe(fn);
            await haredo.queue(queue).publish('test');
            await delay(50);
            expect(fn).to.be.calledOnce;
            expect(middlewareFn).to.be.calledOnce;
        });
        it('should not call subscriber callback if middleware acks/nacks the message', async () => {
            const queue = new Queue('test');
            const middlewareFn = spy(async (msg, next) => {
                msg.nack(false);
                await next();
            });
            const fn = spy((data, msg) => {
            });
            await haredo.queue(queue).use(middlewareFn).subscribe(fn);
            await haredo.queue(queue).publish('test');
            await delay(50);
            expect(fn).to.be.not.called;
            expect(middlewareFn).to.be.calledOnce;
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
