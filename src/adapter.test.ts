import { AMQPChannel, AMQPClient, AMQPConsumer, AMQPError, AMQPQueue } from '@cloudamqp/amqp-client';
import { expect } from 'hein';
import { SinonStub, spy, stub } from 'sinon';
import { Adapter, createAdapter } from './adapter';
import { delay } from './utils/delay';
import { isHaredoMessage } from './haredo-message';

// eslint-disable-next-line mocha/no-exports
export type Stubify<T> = {
    [P in keyof T]: SinonStub & Stubify<T[P]> & T[P];
};

describe('adapter', () => {
    let mockAmqp: Stubify<AMQPClient>;
    let mockClient: Stubify<AMQPClient>;
    let mockChannel: Stubify<AMQPChannel>;
    let mockConsumer: Stubify<AMQPConsumer>;
    let mockQueue: Stubify<AMQPQueue>;
    let adapter: Adapter;
    beforeEach(() => {
        mockChannel = stub({
            publish: () => Promise.resolve(),
            queue: () => Promise.resolve(),
            exchangeDeclare: () => Promise.resolve(),
            queueBind: () => Promise.resolve(),
            basicConsume: () => Promise.resolve(),
            close: () => Promise.resolve(),
            basicPublish: () => Promise.resolve(),
            prefetch: () => Promise.resolve(),
            confirmSelect: () => Promise.resolve()
        }) as any;
        mockClient = stub({
            connect: () => Promise.resolve(),
            close: () => Promise.resolve(),
            channel: () => Promise.resolve(mockChannel)
        }) as any;
        mockConsumer = stub({
            cancel: () => Promise.resolve(),
            channel: mockChannel,
            wait: () => Promise.resolve()
        }) as any;
        mockClient.channel.returns(mockChannel);
        mockChannel.basicConsume.returns(mockConsumer);
        mockChannel.queue.returns(Promise.resolve('queueName'));
        mockAmqp = stub().returns(mockClient) as any;
        mockConsumer.wait.returns(Promise.resolve());
        mockQueue = stub({
            publish: () => Promise<void>
        }) as any;
        adapter = createAdapter(mockAmqp as any, stub().returns(mockQueue) as any, 'url');
    });
    describe('connect', () => {
        it('should call connect on connection', async () => {
            await adapter.connect();
            expect(mockClient.connect).to.have.been.calledOnce();
        });
        it('should not call connect twice when called twice', async () => {
            await adapter.connect();
            await adapter.connect();
            expect(mockClient.connect).to.have.been.calledOnce();
        });
        it('should return client on connect', async () => {
            const client = await adapter.connect();
            expect<any>(client).to.equal(mockClient);
        });
        it('should call connect again when connection disconnects', async () => {
            await adapter.connect();
            mockClient.onerror(new AMQPError('Big sad', mockClient as any));
            expect(mockClient.connect).to.have.been.calledTwice();
        });
        it('should recall connect if it fails the first time', async () => {
            mockClient.connect.onFirstCall().returns(Promise.reject(new Error('fail')));
            await adapter.connect();
            expect(mockClient.connect).to.have.been.calledTwice();
        });
        it('should not call connect twice if one call is already active', async () => {
            mockClient.connect.onFirstCall().returns(delay(10));
            await Promise.all([adapter.connect(), adapter.connect()]);
            expect(mockClient.connect).to.have.been.calledOnce();
        });
        it('should create an url when passed an object', async () => {
            const objectAdapter = createAdapter(mockAmqp as any, stub().returns(mockQueue) as any, {
                hostname: 'localhost',
                password: 'guest',
                port: 5672,
                protocol: 'amqp',
                username: 'guest',
                vhost: '/'
            });
            await objectAdapter.connect();
            expect(mockAmqp)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith('amqp://guest:guest@localhost:5672/');
        });
    });
    describe('close', () => {
        it('should disconnect', async () => {
            await adapter.connect();
            await adapter.close();
            expect(mockClient.close).to.have.been.calledOnce();
        });
        it('should not throw when client has not been connected', async () => {
            await adapter.close();
            expect(mockClient.close).to.not.have.been.called();
        });
        it('should close consumers', async () => {
            await adapter.connect();
            await adapter.subscribe('test', { onClose: stub() }, () => {});
            await adapter.close();
            expect(mockConsumer.cancel).to.have.been.calledOnce();
        });
        it('should close publisher channel', async () => {
            await adapter.connect();
            await adapter.sendToQueue('test', 'some message', {});
            await adapter.close();
            expect(mockChannel.close).to.have.been.calledOnce();
        });
        it('should close consumers channels', async () => {
            await adapter.connect();
            await adapter.subscribe('test', { onClose: stub() }, () => {});
            await adapter.close();
            expect(mockChannel.close).to.have.been.calledOnce();
        });
    });
    describe('sendToQueue', () => {
        beforeEach(async () => {
            await adapter.connect();
        });
        it('should create a channel', async () => {
            await adapter.sendToQueue('test', 'some message', {});
            expect(mockClient.channel).to.have.been.calledOnce();
        });
        it('should call publish', async () => {
            await adapter.sendToQueue('test', 'some message', {});
            expect(mockQueue.publish).to.have.been.calledOnce();
        });
        it('should reuse channel', async () => {
            await adapter.sendToQueue('test', 'some message', {});
            await adapter.sendToQueue('test', 'some message', {});
            expect(mockClient.channel).to.have.been.calledOnce();
        });
        it('should use confirm channel', async () => {
            await adapter.sendToQueue('test', 'some message', { confirm: true });
            expect(mockChannel.confirmSelect).to.have.been.calledOnce();
        });
        it('should reuse confirm channel', async () => {
            await adapter.sendToQueue('test', 'some message', { confirm: true });
            await adapter.sendToQueue('test', 'some message', { confirm: true });
            expect(mockClient.channel).to.have.been.calledOnce();
        });
        it('should throw if called when disconnected', async () => {
            await adapter.close();
            await expect(adapter.sendToQueue('test', 'some message', {})).to.reject(/No client/);
        });
    });
    describe('publish', () => {
        beforeEach(async () => {
            await adapter.connect();
        });
        it('should create a channel', async () => {
            await adapter.publish('test', 'user.new', 'some message', {});
            expect(mockClient.channel).to.have.been.calledOnce();
        });
        it('should call publish', async () => {
            await adapter.publish('test', 'user.new', 'some message', {});
            expect(mockChannel.basicPublish).to.have.been.calledOnce();
        });
        it('should not open two channels when publishing twice', async () => {
            await adapter.publish('test', 'user.new', 'some message', {});
            await adapter.publish('test', 'user.new', 'some message', {});
            expect(mockClient.channel).to.have.been.calledOnce();
        });
        it('should use confirm channel if confirm = true', async () => {
            await adapter.publish('test', '#', 'test', { confirm: true });
            expect(mockChannel.confirmSelect).to.have.been.calledOnce();
        });
        it('should not open two confirmchannels', async () => {
            await adapter.publish('test', '#', 'test', { confirm: true });
            await adapter.publish('test', '#', 'test', { confirm: true });
            expect(mockChannel.confirmSelect).to.have.been.calledOnce();
            expect(mockClient.channel).to.have.been.calledOnce();
        });
        it('should throw if called before connect', async () => {
            await adapter.close();
            await expect(adapter.publish('test', '#', 'test', { confirm: true })).to.reject(/No client/);
        });
    });
    describe('setupQueue', () => {
        it('should create queue', async () => {
            await adapter.connect();
            await adapter.createQueue('test');
            expect(mockChannel.queue).to.have.been.calledOnce().and.to.have.been.calledWith('test');
        });
        it('should set up queue with arguments', async () => {
            await adapter.connect();
            await adapter.createQueue('test', { durable: true }, { 'x-queue-type': 'quorum' });
            expect(mockChannel.queue)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith('test', { durable: true }, { 'x-queue-type': 'quorum' });
        });
        it('should throw if called before connect', async () => {
            await expect(adapter.createQueue('test')).to.reject(/No client/);
        });
    });
    describe('setupExchange', () => {
        it('should create exchange', async () => {
            await adapter.connect();
            await adapter.createExchange('test', 'topic', { autoDelete: true });
            expect(mockChannel.exchangeDeclare)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith('test', 'topic', { autoDelete: true });
        });
        it('should set up exchange with arguments', async () => {
            await adapter.connect();
            await adapter.createExchange('test', 'topic', { autoDelete: true }, { 'alternate-exchange': 'alternate' });
            expect(mockChannel.exchangeDeclare)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith(
                    'test',
                    'topic',
                    { autoDelete: true },
                    { 'alternate-exchange': 'alternate' }
                );
        });
        it('should throw if called before connect', async () => {
            await expect(adapter.createExchange('test', 'topic')).to.reject(/No client/);
        });
    });
    describe('bindQueue', () => {
        it('should bind exchange', async () => {
            await adapter.connect();
            await adapter.bindQueue('testQueue', 'testExchange', '#');
            expect(mockChannel.queueBind).to.have.been.calledOnce();
        });
        it('should throw if called before connect', async () => {
            await expect(adapter.bindQueue('testQueue', 'testExchange', '#')).to.reject(/No client/);
        });
        it('should default the routing key to #', async () => {
            await adapter.connect();
            await adapter.bindQueue('testQueue', 'testExchange');
            expect(mockChannel.queueBind)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith('testQueue', 'testExchange', '#');
        });
    });
    describe('subscribe', () => {
        beforeEach(async () => {
            await adapter.connect();
        });
        it('should call subscribe', async () => {
            const callback = stub();
            await adapter.subscribe('test', { onClose: stub() }, callback);
            expect(mockChannel.basicConsume)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith('test', { noAck: false, exclusive: false });
        });
        it('should call callback with wrapped message', async () => {
            const callback = stub();
            await adapter.subscribe('test', { onClose: stub() }, callback);
            const internalCallback = mockChannel.basicConsume.firstCall.lastArg;
            internalCallback({ bodyString: () => '"Hello, world"', properties: {} });
            expect(isHaredoMessage(callback.lastCall.firstArg)).to.be.true();
        });
        it('should cancel', async () => {
            const callback = stub();
            const consumer = await adapter.subscribe('test', { onClose: stub() }, callback);
            await consumer.cancel();
            expect(mockConsumer.cancel).to.have.been.calledOnce();
        });
        it('should call onClose callback when consumer is closed with error', async () => {
            const onClose = stub();
            const error = new AMQPError('Big sad', mockClient as any);
            mockConsumer.wait.rejects(error);
            await adapter.subscribe('test', { onClose }, () => {});
            await delay(1);
            expect(onClose).to.have.been.calledOnce().and.to.have.been.calledWith(error);
        });
        it('should call onClose callback when consumer is closed gracefully', async () => {
            const onClose = stub();
            mockConsumer.wait.resolves();
            await adapter.subscribe('test', { onClose }, () => {});
            await delay(1);
            expect(onClose).to.have.been.calledOnce().and.to.have.been.calledWith(null);
        });
        it('should set prefetch', async () => {
            await adapter.subscribe('test', { onClose: stub(), prefetch: 1 }, () => {});
            expect(mockChannel.prefetch).to.have.been.calledOnce().and.to.have.been.calledWith(1);
        });
        it('should await on callback', async () => {
            let callbackEnd: Date;
            const callback = spy(async () => {
                await delay(10);
                callbackEnd = new Date();
            });
            await adapter.subscribe('test', { onClose: stub() }, callback);
            const internalCallback = mockChannel.basicConsume.firstCall.lastArg;
            await internalCallback({ bodyString: () => '"Hello, world"', properties: {} });
            expect(callback).to.have.been.calledOnce();
            expect(callbackEnd!).to.not.be.undefined();
        });
        it('should throw if called while disconnected', async () => {
            await adapter.close();
            await expect(adapter.subscribe('test', { onClose: stub() }, () => {})).to.reject(/No client/);
        });
    });
});
