import 'mocha';
import { Queue, Haredo, Exchange } from '../../src/index'
import { setup, teardown, checkQueue } from './helpers/amqp';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { ExchangeType } from '../../src/exchange';
import { delayPromise } from '../../src/utils';

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

    it('should require x-delayed-type', () => {
        expect(() => new Exchange('testExchange', ExchangeType.Delayed)).to.throw();
        expect(() => {
            new Exchange(
                'testExchange',
                ExchangeType.Delayed,
                {
                    arguments: {
                        'x-delayed-type': ExchangeType.Direct
                    }
                }
            ).delayed();
        }).to.throw();
    });

    it('should work with direct exchange', async () => {
        const exchange = new Exchange('testExchange', ExchangeType.Direct)
            .durable()
            .delayed();
        const queue = new Queue<SimpleMessage>('testQueue').durable();
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
        await delayPromise(50);
        await expect(checkQueue(queue.name))
            .to.eventually.have.property('messageCount', 1);
    });

});
