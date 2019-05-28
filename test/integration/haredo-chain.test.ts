import 'mocha';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { Haredo, Queue, Exchange, ExchangeType } from '../../src/index';
import { setup, teardown, getSingleMessage, checkQueue } from './helpers/amqp';
import { delay } from '../../src/utils';

use(chaiAsPromised);

describe('HaredoChain', () => {
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
    it('should redirect nacked messages from main queue to dead queue', async function () {
        const deadExchange = new Exchange('test.dead', ExchangeType.Fanout);
        const deadQueue = new Queue('test.dead');
        const queue = new Queue('test').dead(deadExchange);
        await haredo.queue(deadQueue).exchange(deadExchange).setup();
        await haredo.queue(queue).publish('message');
        const consumer = await haredo
            .queue(queue)
            .subscribe((data, msg) => {
                msg.nack(false);
            });
        await delay(50);
        await consumer.cancel();
        await expect(checkQueue('test.dead')).to.eventually.not.be.rejected;
        await expect(getSingleMessage('test.dead').then(x => x.content)).to.eventually.eql('"message"');
    });
    it('should publish via confirm channel', async () => {
        await haredo
            .queue('test')
            .confirm()
            .publish('test');
    })
});
