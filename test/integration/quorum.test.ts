import { expect } from 'chai';
import { makeExchangeConfig } from '../../src/exchange';
import { Haredo, haredo } from '../../src/haredo';
import { makeQueueConfig } from '../../src/queue';
import { delay } from '../../src/utils';
import { getSingleMessage, rabbitUrl, setup } from './helpers/amqp';
import { makeDeferred } from './helpers/utils';

describe('integration/quorum', () => {
    let rabbit: Haredo;
    beforeEach(async () => {
        await setup();
        rabbit = haredo({
            connection: rabbitUrl
        });
        await rabbit.connect();
    });
    afterEach(async () => {
        await rabbit.close();
    })
    it('should set delivery limit on message', async () => {
        const dlx = makeExchangeConfig('test.dlx', 'topic');
        const dlq = makeQueueConfig('test.dlq');
        await rabbit.queue(dlq).bindExchange(dlx, '#').setup();
        const q = makeQueueConfig('testq').type('quorum').deliveryLimit(1).dead(dlx);
        const { resolve, promise } = makeDeferred();
        let messageDeliveryCount: number;
        const consumer = await rabbit.queue(q)
            .subscribe(async ({ deliveryCount, nack }) => {
                messageDeliveryCount = deliveryCount;
                nack();
                await delay(20);
                resolve();
            });
        await rabbit.queue(q).publish('test');
        await promise.then(x => consumer.close());
        const msg = await getSingleMessage(dlq.getName());
        expect(msg.properties.headers['x-first-death-reason']).to.equal('delivery_limit');
        expect(messageDeliveryCount).to.equal(1);
    });
});
