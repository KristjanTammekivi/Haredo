import 'mocha';
import { Queue, Haredo, Exchange } from '../../src/index'
import { setup, teardown, checkQueue } from './helpers/amqp';
import { delay } from 'bluebird';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { ExchangeType } from '../../src/exchange';

use(chaiAsPromised);

describe('Delayed Exchange', () => {
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

    interface SimpleMessage {
        test: number;
    }

    it('should work with direct exchange', async () => {
        const exchange = new Exchange(
            'testExchange',
            ExchangeType.Delayed,
            {
                durable: true,
                arguments: { 'x-delayed-type': ExchangeType.Direct }
            }
        );
        const queue = new Queue<SimpleMessage>('testQueue', { durable: true });
        await haredo
            .exchange(exchange, 'test')
            .queue(queue)
            .setup();
        await haredo
            .exchange(exchange)
            .publish({ test: 1 }, 'test', {
                headers: {
                    'x-delay': 50
                }
            });

        await expect(checkQueue(queue.name))
            .to.eventually.have.property('messageCount', 0);
        await delay(50);
        await expect(checkQueue(queue.name))
            .to.eventually.have.property('messageCount', 1);
    });

});
