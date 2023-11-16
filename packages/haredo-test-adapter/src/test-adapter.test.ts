import { expect } from 'hein';
import { SinonStubbedInstance, spy } from 'sinon';
import { TestAdapter, createTestAdapter } from './test-adapter';
import { Haredo } from 'haredo';
import type { HaredoInstance } from 'haredo';

const url = 'amqp://localhost';

describe('testAdapter', () => {
    let adapter: SinonStubbedInstance<TestAdapter>;
    let haredo: HaredoInstance;
    beforeEach(() => {
        adapter = createTestAdapter();
        haredo = Haredo({ url, adapter });
    });
    describe('connect', () => {
        it('should have a connect stub', async () => {
            await adapter.connect();
            expect(adapter.connect).to.have.been.calledOnce();
        });
        it('should emit connected event', async () => {
            const eventspy = spy();
            adapter.emitter.on('connected', eventspy);
            await adapter.connect();
            expect(eventspy).to.have.been.calledOnce();
        });
    });
    describe('close', () => {
        it('should have a close stub', async () => {
            await adapter.close();
            expect(adapter.close).to.have.been.calledOnce();
        });
        it('should emit disconnected event', async () => {
            const eventspy = spy();
            adapter.emitter.on('disconnected', eventspy);
            await adapter.close();
            expect(eventspy).to.have.been.calledOnce();
        });
        it('should remove all subscribers', async () => {
            await haredo.queue('test').subscribe(() => {});
            await adapter.close();
            expect(adapter.subscribers).to.be.empty();
        });
    });
    describe('createQueue', () => {
        it('should have a createQueue stub', async () => {
            await adapter.createQueue('test', { durable: true }, { 'message-ttl': 1000 });
            expect(adapter.createQueue).to.have.been.calledOnce();
            expect(adapter.createQueue).to.have.been.calledWith('test', { durable: true }, { 'message-ttl': 1000 });
        });
        it('should add queues to an accessible array', async () => {
            await adapter.createQueue('test', { durable: true }, { 'message-ttl': 1000 });
            expect(adapter.queues).to.have.lengthOf(1);
            expect(adapter.queues).to.eql([
                {
                    name: 'test',
                    params: { durable: true },
                    arguments: { 'message-ttl': 1000 }
                }
            ]);
        });
        it('should not add the same queue twice', async () => {
            await adapter.createQueue('test', { durable: true }, { 'message-ttl': 1000 });
            await adapter.createQueue('test', { durable: true }, { 'message-ttl': 1000 });
            expect(adapter.queues).to.have.lengthOf(1);
        });
        it('should throw if trying to add a queue with the same name but different arguments', async () => {
            await adapter.createQueue('test', { durable: true }, { 'message-ttl': 1000 });
            await expect(adapter.createQueue('test', { durable: true }, { 'message-ttl': 2000 })).to.reject();
        });
        it('should throw if trying to add a queue with the same name but different params', async () => {
            await adapter.createQueue('test', { durable: true }, { 'message-ttl': 1000 });
            await expect(adapter.createQueue('test', { durable: false }, { 'message-ttl': 1000 })).to.reject();
        });
        it('should be possible to modify behavour of the stub', async () => {
            adapter.createQueue.onFirstCall().resolves('abcdefg');
            expect(await adapter.createQueue('test')).to.equal('abcdefg');
        });
        it('should work as part of haredo', async () => {
            await haredo.queue('test', { durable: true }, { 'message-ttl': 1000 }).setup();
            expect(adapter.queues).to.have.lengthOf(1);
            expect(adapter.queues).to.eql([
                {
                    name: 'test',
                    params: { durable: true },
                    arguments: { 'message-ttl': 1000 }
                }
            ]);
        });
    });
    describe('createExchange', () => {
        it('should have a createExchange stub', async () => {
            await adapter.createExchange('test', 'direct', { durable: true });
            expect(adapter.createExchange).to.have.been.calledOnce();
            expect(adapter.createExchange).to.have.been.calledWith('test', 'direct', { durable: true });
        });
        it('should add exchanges to an accessible array', async () => {
            await adapter.createExchange('test', 'direct', { durable: true }, { 'alternate-exchange': 'test2' });
            expect(adapter.exchanges).to.have.lengthOf(1);
            expect(adapter.exchanges).to.eql([
                {
                    name: 'test',
                    type: 'direct',
                    params: { durable: true },
                    arguments: { 'alternate-exchange': 'test2' }
                }
            ]);
        });
        it('should not add the same exchange twice', async () => {
            await adapter.createExchange('test', 'direct', { durable: true }, { 'alternate-exchange': 'test2' });
            await adapter.createExchange('test', 'direct', { durable: true }, { 'alternate-exchange': 'test2' });
            expect(adapter.exchanges).to.have.lengthOf(1);
        });
        it('should throw if trying to add a exchange with the same name but different arguments', async () => {
            await adapter.createExchange('test', 'direct', { durable: true }, { 'alternate-exchange': 'test2' });
            await expect(
                adapter.createExchange('test', 'direct', { durable: true }, { 'alternate-exchange': 'test3' })
            ).to.reject();
        });
        it('should throw if trying to add a exchange with the same name but different params', async () => {
            await adapter.createExchange('test', 'direct', { durable: true }, { 'alternate-exchange': 'test2' });
            await expect(
                adapter.createExchange('test', 'direct', { durable: false }, { 'alternate-exchange': 'test2' })
            ).to.reject();
        });
        it('should throw if trying to add a exchange with the same name but different type', async () => {
            await adapter.createExchange('test', 'direct', { durable: true }, { 'alternate-exchange': 'test2' });
            await expect(
                adapter.createExchange('test', 'fanout', { durable: true }, { 'alternate-exchange': 'test2' })
            ).to.reject();
        });
        it('should work as part of Haredo', async () => {
            await haredo.exchange('test', 'direct', { durable: true }, { 'alternate-exchange': 'test2' }).setup();
            expect(adapter.exchanges).to.have.lengthOf(1);
            expect(adapter.exchanges).to.eql([
                {
                    name: 'test',
                    type: 'direct',
                    params: { durable: true },
                    arguments: { 'alternate-exchange': 'test2' }
                }
            ]);
        });
    });
    describe('subscribe', () => {
        it('should not smoke', async () => {
            await haredo.queue('test').subscribe(() => {});
        });
        it('should add subscriber to list', async () => {
            await haredo.queue('test').subscribe(() => {});
            expect(adapter.subscribers).to.have.lengthOf(1);
        });
        it('should remove subscriber on cancel', async () => {
            const consumer = await haredo.queue('queue').subscribe(() => {});
            await consumer.cancel();
            expect(adapter.subscribers).to.be.empty();
        });
        it('should throw when cancelling twice', async () => {
            const consumer = await haredo.queue('queue').subscribe(() => {});
            await consumer.cancel();
            await expect(consumer.cancel()).to.reject();
        });
        it('should be possible to run the callback', async () => {
            const cbSpy = spy();
            await haredo.queue('queue').subscribe(cbSpy);
            await adapter.callSubscriber('queue', '"test"');
            expect(cbSpy).to.have.been.calledOnce();
            expect(cbSpy).to.have.been.calledWith('test');
        });
        it('should return a stub of a message', async () => {
            await haredo.queue('queue').subscribe(() => {
                throw new Error('Fail');
            });
            const message = await adapter.callSubscriber('queue', '"test"');
            expect(message.nack).to.have.been.calledOnce();
        });
    });
    describe('reset', () => {
        it('should clear subscriber array', async () => {
            await haredo.queue('test').subscribe(() => {});
            adapter.reset();
            expect(adapter.subscribers).to.be.empty();
        });
    });
});
