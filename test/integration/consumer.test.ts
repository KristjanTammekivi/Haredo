import { Haredo, haredo } from '../../src/haredo';
import { setup, teardown, checkQueue, getChannel } from './helpers/amqp';
import { delay } from '../../src/utils';
import { spy } from 'sinon';

import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import { use, expect } from 'chai';
import { EventEmitter } from 'events';

use(sinonChai);
use(chaiAsPromised);

describe('consuming', () => {
    let rabbit: Haredo;
    beforeEach(async () => {
        await setup();
        rabbit = haredo({
            connection: 'amqp://localhost:5672/test'
        });
    });
    afterEach(async () => {
        rabbit.close();
        await teardown();
    });
    it('should setup queue when subscribe is called', async () => {
        await rabbit.queue('test').subscribe(() => {});
        await checkQueue('test');
    });
    it('should receive a message', async () => {
        const cbSpy = spy()
        await rabbit.queue('test2').subscribe(cbSpy);
        await rabbit.queue('test2').publish('test');
        await delay(20);
        expect(cbSpy).to.be.calledOnce;
        expect(cbSpy).to.be.calledWithMatch({ data: 'test' });
    });
    it('should close consumer when .close is called', async () => {
        const consumer = await rabbit.queue('test').subscribe(() => { });
        expect(await isConsumerClosed('test')).to.be.false;
        await consumer.close();
        expect(await isConsumerClosed('test')).to.be.true;
    });
    it('should close consumer if haredo gets closed', async () => {
        const consumer = await rabbit.queue('test').subscribe(() => { });
        await rabbit.close();
        expect(await consumer.isClosed).to.be.true;
    });
});

export const expectFail = async (promise: Promise<any>, pattern?: string) => {
    try {
        await promise;
        throw new Error('Expected promise to be rejected but it was resolved');
    } catch (e) {
        if (pattern) {
            if (!e.message.includes(pattern)) {
                throw new Error(`Expected promise to be rejected with an error matching ${ pattern }, but it was rejected with ${ e }`);
            }
        }
    }
}

const isConsumerClosed = async(queue: string) => {
    const channel = await getChannel();
    try {
        await channel.consume('test', () => { }, { exclusive: true });
        await channel.close();
    } catch (e) {
        if (e.message.includes('exclusive')) {
            return false;
        }
        throw e;
    }
    return true;
}

export const eventToPromise = (emitter: EventEmitter, event: string) => {
    return new Promise((resolve) => {
        emitter.once(event, () => {
            resolve();
        });
    });
};
