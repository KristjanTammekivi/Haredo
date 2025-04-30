import { expect } from 'hein';
import { Haredo } from './haredo';
import { rabbitAdmin } from './utils/test/rabbit-admin';
import { Exchange } from './exchange';
import { HaredoInstance } from './types';
import { delay } from './utils/delay';
import { Queue } from './queue';
import { stub } from 'sinon';

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

    it('should declare a queue passively', async () => {
        await expect(haredo.queue('testQueue', { passive: true }).setup()).to.reject(
            /no queue 'testQueue' in vhost 'test'/
        );
        await expect(haredo.queue(Queue('testQueue').passive()).setup()).to.reject(
            /no queue 'testQueue' in vhost 'test'/
        );
    });

    it('should declare an exchange passively', async () => {
        await expect(haredo.exchange('testExchange', 'topic', { passive: true }).setup()).to.reject(
            /no exchange 'testExchange' in vhost 'test'/
        );
        await expect(haredo.exchange(Exchange('testExchange', 'topic', { passive: true })).setup()).to.reject(
            /no exchange 'testExchange' in vhost 'test'/
        );
    });

    it('should delete queue', async () => {
        await haredo.queue('testQueue').setup();
        await haredo.queue('testQueue').delete();
        await expect(rabbitAdmin.getQueue('test', 'testQueue')).to.reject(/Resource not found/);
    });

    it('should delete exchange', async () => {
        await haredo.exchange(Exchange('testExchange', 'topic')).setup();
        await haredo.exchange(Exchange('testExchange', 'topic')).delete();
        await expect(rabbitAdmin.getExchange('test', 'testExchange')).to.reject(/Resource not found/);
    });

    it('should unbind queue', async () => {
        await haredo.queue('testQueue').bindExchange('testExchange', '#', 'topic').setup();
        await haredo.queue('testQueue').unbindExchange('testExchange', '#');
        expect(
            await rabbitAdmin.getBindings({
                source: 'testExchange',
                destination: 'testQueue',
                type: 'queue',
                vhost: 'test'
            })
        ).to.have.lengthOf(0);
    });

    it('should unbind exchange', async () => {
        await haredo
            .exchange(Exchange('destinationExchange', 'topic'))
            .bindExchange('sourceExchange', '#', 'topic')
            .setup();
        await haredo.exchange(Exchange('destinationExchange', 'topic')).unbindExchange('sourceExchange', '#');
        expect(
            await rabbitAdmin.getBindings({
                source: 'sourceExchange',
                destination: 'destinationExchange',
                type: 'exchange',
                vhost: 'test'
            })
        ).to.have.lengthOf(0);
    });

    it('should purge queue', async () => {
        await haredo.queue('testQueue').publish('test message');
        await haredo.queue('testQueue').purge();
        const messages = await rabbitAdmin.getMessages('test', 'testQueue', {
            ackmode: 'ack_requeue_false',
            count: '1',
            encoding: 'auto'
        });
        expect(messages).to.have.lengthOf(0);
    });

    it('should subscribe with anonymous queue', async () => {
        const exchange = Exchange('testExchange', 'topic');
        const subscribeStub = stub();
        await haredo.queue('').bindExchange('testExchange', '#', 'topic').subscribe(subscribeStub);
        await haredo.exchange(exchange).publish('test message', 'test');
        await delay(50);
        expect(subscribeStub).to.have.been.calledOnce();
    });
});
