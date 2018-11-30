import 'mocha';
import { Haredo, Queue, Exchange } from '../../src/index'
import { setup, teardown, checkQueue, checkExchange, getSingleMessage } from './helpers/amqp';
import { use, expect } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { ExchangeType } from '../../src/exchange';
import { delay } from 'bluebird';

use(chaiAsPromised);

describe('Dead Letter Exchange', () => {
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

    it('should send non-requeud nacked messages to dlx', async () => {
        const dlx = new Exchange('testDlx', ExchangeType.Fanout, {});
        const dlq = new Queue('testDlq', { durable: true });

        const queue = new Queue<{ test: number }>('testQueue').deadLetterExchange(dlx);
        const exchange = new Exchange('testExchange', ExchangeType.Direct, {});

        haredo
            .exchange(dlx, '*')
            .queue(dlq)
            .setup();

        const chain = await haredo
            .queue(queue)
            .exchange(exchange, '*')

        await chain.publish({ test: 5 });

        const consumer = await chain
            .subscribe(async (message) => {
                await message.nack(false);
            });

        delay(50);

        await consumer.cancel();

        const message = await getSingleMessage(dlq.name);
    });

});
