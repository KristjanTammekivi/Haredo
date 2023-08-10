import { expect } from 'hein';
import { Haredo, HaredoInstance } from './haredo';
import { rabbitAdmin } from './utils/test/rabbit-admin';
import { Exchange } from './exchange';

describe('haredo integration', () => {
    let haredo: HaredoInstance;
    beforeEach(async () => {
        await rabbitAdmin.createVhost('test');
        haredo = Haredo({ url: 'amqp://localhost:5672/test' });
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
});
