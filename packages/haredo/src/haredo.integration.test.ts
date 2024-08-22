import { expect } from 'hein';
import { Haredo } from './haredo';
import { rabbitAdmin } from './utils/test/rabbit-admin';
import { Exchange } from './exchange';
import { HaredoInstance } from './types';
import { delay } from './utils/delay';

const RABBIT_URL = 'amqp://localhost:5672/test';
describe('haredo integration', () => {
    let haredo: HaredoInstance;

    beforeEach(async () => {
        await rabbitAdmin.createVhost('test');
        haredo = Haredo({ url: RABBIT_URL, log: () => {} });
        await haredo.connect();
    });

    afterEach(async () => {
        await haredo.close();
        await rabbitAdmin.deleteVhost('test');
    });

    it('should setup exchange', async () => {
        await haredo.exchange(Exchange('testExchange', 'topic')).setup();
        const exchange = await rabbitAdmin.getExchange('test', 'testExchange');
        expect(exchange).to.partially.eql({
            name: 'testExchange'
        });
    });

    it('should publish message', async () => {
        await haredo.exchange(Exchange('testExchange', 'topic')).setup();
        await rabbitAdmin.createQueue('test', 'testQueue', { auto_delete: false });
        await rabbitAdmin.createBinding({
            vhost: 'test',
            source: 'testExchange',
            destination: 'testQueue',
            type: 'queue',
            routingKey: '#',
            args: {}
        });
        await haredo.exchange(Exchange('testExchange', 'topic')).publish('test message', 'test');
        const messages = await rabbitAdmin.getMessages('test', 'testQueue', {
            ackmode: 'ack_requeue_false',
            count: '1',
            encoding: 'auto'
        });
        expect(messages).to.have.lengthOf(1);
        expect(messages).to.partially.eql([
            {
                payload: '"test message"'
            }
        ]);
    });

    it('should setup queue', async () => {
        await haredo.queue('testQueue').setup();
        const queue = await rabbitAdmin.getQueue('test', 'testQueue');
        expect(queue).to.partially.eql({
            name: 'testQueue'
        });
    });

    it('should publish to queue', async () => {
        await haredo.queue('testQueue').publish('test message');
        const messages = await rabbitAdmin.getMessages('test', 'testQueue', {
            ackmode: 'ack_requeue_false',
            count: '1',
            encoding: 'auto'
        });
        expect(messages).to.have.lengthOf(1);
        expect(messages).to.partially.eql([
            {
                payload: '"test message"'
            }
        ]);
    });

    it('should not resolve cancel promise before all in flight messages are handled', async () => {
        let messageHandledAt: Date | undefined;
        const consumer = await haredo.queue('testQueue').subscribe(async () => {
            await delay(1000);
            messageHandledAt = new Date();
        });
        await haredo.queue('testQueue').confirm().publish('test message');
        await delay(100);
        await consumer.cancel();
        expect(messageHandledAt).to.not.be.undefined();
    });
});
