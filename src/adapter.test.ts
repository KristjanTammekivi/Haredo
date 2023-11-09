import { AMQPChannel, AMQPClient, AMQPConsumer, AMQPError, AMQPQueue } from '@cloudamqp/amqp-client';
import { expect } from 'hein';
import { SinonStub, spy, stub } from 'sinon';
import { Adapter, createAdapter } from './adapter';
import { delay } from './utils/delay';
import { isHaredoMessage } from './haredo-message';
import { NotConnectedError } from './errors';
import { Logger, createLogger } from './utils/logger';
import { typedEventToPromise } from './utils/event-to-promise';

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
    let logger: Logger;
    beforeEach(() => {
        logger = createLogger(() => {});
        mockChannel = stub({
            publish: () => Promise.resolve(),
            queue: () => Promise.resolve(),
            queueDelete: () => Promise.resolve(),
            exchangeDeclare: () => Promise.resolve(),
            exchangeDelete: () => Promise.resolve(),
            queueBind: () => Promise.resolve(),
            queueUnbind: () => Promise.resolve(),
            basicConsume: () => Promise.resolve(),
            close: () => Promise.resolve(),
            basicPublish: () => Promise.resolve(),
            prefetch: () => Promise.resolve(),
            confirmSelect: () => Promise.resolve(),
            exchangeBind: () => Promise.resolve(),
            exchangeUnbind: () => Promise.resolve(),
            queuePurge: () => Promise.resolve()
        }) as any;
        mockClient = stub({
            connect: () => Promise.resolve(),
            close: () => Promise.resolve(),
            channel: () => Promise.resolve(mockChannel)
        }) as any;
        mockConsumer = stub({
            cancel: async () => {},
            channel: mockChannel,
            wait: () => Promise.resolve()
        }) as any;
        mockClient.channel.returns(mockChannel);
        mockChannel.basicConsume.returns(mockConsumer);
        mockChannel.queue.returns(Promise.resolve('queueName'));
        mockAmqp = stub().returns(mockClient) as any;
        mockConsumer.wait.returns(Promise.resolve());
        mockConsumer.cancel.returns(Promise.resolve());
        mockQueue = stub({
            publish: () => Promise<void>
        }) as any;
        adapter = createAdapter(mockAmqp as any, stub().returns(mockQueue) as any, { url: 'url' }, logger);
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
            mockClient.onerror('big sad');
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
            const objectAdapter = createAdapter(
                mockAmqp as any,
                stub().returns(mockQueue) as any,
                {
                    url: {
                        hostname: 'localhost',
                        password: 'guest',
                        port: 5672,
                        protocol: 'amqp',
                        username: 'guest',
                        vhost: '/'
                    }
                },
                logger
            );
            await objectAdapter.connect();
            expect(mockAmqp)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith('amqp://guest:guest@localhost:5672/');
        });
        it('should forward TLS arguments', async () => {
            adapter = createAdapter(
                mockAmqp as any,
                stub().returns(mockQueue) as any,
                {
                    url: 'url',
                    tlsOptions: {
                        passphrase: 'passphrase'
                    }
                },
                logger
            );
            await adapter.connect();
            expect(mockAmqp).to.have.been.calledOnce().and.to.have.been.calledWith('url', { passphrase: 'passphrase' });
        });
        it('should adjust reconnection delays', async () => {
            adapter = createAdapter(mockAmqp as any, mockQueue as any, { url: 'url', reconnectDelay: 100 }, logger);
            mockClient.connect.onFirstCall().rejects(new Error('big sad'));
            const connectPromise = adapter.connect();
            await delay(10);
            expect(mockClient.connect).to.have.been.calledOnce();
            await delay(130);
            expect(mockClient.connect).to.have.been.calledTwice();
            await connectPromise;
        });
        it('should adjust reconnection delays based on a callback', async () => {
            adapter = createAdapter(
                mockAmqp as any,
                mockQueue as any,
                { url: 'url', reconnectDelay: () => 100 },
                logger
            );
            mockClient.connect.onFirstCall().rejects(new Error('big sad'));
            const connectPromise = adapter.connect();
            await delay(10);
            expect(mockClient.connect).to.have.been.calledOnce();
            await delay(130);
            expect(mockClient.connect).to.have.been.calledTwice();
            await connectPromise;
        });
        it('should emit connected event', async () => {
            const promise = typedEventToPromise(adapter.emitter, 'connected');
            await adapter.connect();
            await promise;
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
        it('should close confirm channel', async () => {
            await adapter.connect();
            await adapter.sendToQueue('test', 'some message', { confirm: true });
            await adapter.close();
            expect(mockChannel.close).to.have.been.calledOnce();
        });
        it('should close consumers channels', async () => {
            await adapter.connect();
            await adapter.subscribe('test', { onClose: stub() }, () => {});
            await adapter.close();
            expect(mockChannel.close).to.have.been.calledOnce();
        });
        it('should not close consumers that have already been cancelled', async () => {
            await adapter.connect();
            const consumer = await adapter.subscribe('test', { onClose: stub() }, () => {});
            await consumer.cancel();
            await adapter.close();
            expect(mockConsumer.cancel).to.have.been.calledOnce();
        });
        it('should not call cancel twice on consumers', async () => {
            await adapter.connect();
            const consumer = await adapter.subscribe('test', { onClose: stub() }, () => {});
            await Promise.all([consumer.cancel(), consumer.cancel()]);
            expect(mockConsumer.cancel).to.have.been.calledOnce();
        });
        it('should force close', async () => {
            await adapter.connect();
            let callbackDone = false;
            await adapter.subscribe('test', { onClose: stub() }, async () => {
                await delay(1000);
                callbackDone = true;
            });
            mockChannel.basicConsume.firstCall.lastArg({ bodyString: () => '"Hello, world"', properties: {} });
            await adapter.close(true);
            expect(callbackDone).to.be.false();
        });
        it('should emit disconnect', async () => {
            const promise = typedEventToPromise(adapter.emitter, 'disconnected');
            await adapter.connect();
            await adapter.close();
            await promise;
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
            await expect(adapter.sendToQueue('test', 'some message', {})).to.reject(NotConnectedError);
        });
        it('should unset confirm channel after channel error', async () => {
            await adapter.sendToQueue('test', 'some message', { confirm: true });
            mockChannel.onerror('big sad');
            await adapter.sendToQueue('test', 'some message', { confirm: true });
            expect(mockClient.channel).to.have.been.calledTwice();
        });
        it('should unset publish channel after channel error', async () => {
            await adapter.sendToQueue('test', 'some message', {});
            mockChannel.onerror('big sad');
            await adapter.sendToQueue('test', 'some message', {});
            expect(mockClient.channel).to.have.been.calledTwice();
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
            await expect(adapter.publish('test', '#', 'test', { confirm: true })).to.reject(NotConnectedError);
        });
        it('should unset confirm channel after channel error', async () => {
            await adapter.publish('test', '#', 'test', { confirm: true });
            mockChannel.onerror('big sad');
            await adapter.publish('test', '#', 'test', { confirm: true });
            expect(mockClient.channel).to.have.been.calledTwice();
        });
        it('should unset publish channel after channel error', async () => {
            await adapter.publish('test', '#', 'test', {});
            mockChannel.onerror('big sad');
            await adapter.publish('test', '#', 'test', {});
            expect(mockClient.channel).to.have.been.calledTwice();
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
            await expect(adapter.createQueue('test')).to.reject(NotConnectedError);
        });
        it('should close channel after creating queue', async () => {
            await adapter.connect();
            await adapter.createQueue('test');
            expect(mockChannel.close).to.have.been.calledOnce();
        });
        it('should not try to close channel if onerror is called', async () => {
            await adapter.connect();
            mockChannel.queue.returns(delay(20).then(() => ({ queue: 'test' })));
            const promise = adapter.createQueue('test');
            await delay(5);
            mockChannel.onerror('big sad');
            await promise;
            expect(mockChannel.close).to.not.have.been.called();
        });
        it('should wait for connection before creating queue', async () => {
            mockClient.connect.returns(delay(20));
            const connectPromise = adapter.connect();
            await delay(5);
            await adapter.createQueue('test');
            await connectPromise;
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
            await expect(adapter.createExchange('test', 'topic')).to.reject(NotConnectedError);
        });
        it('should close channel after creating exchange', async () => {
            await adapter.connect();
            await adapter.createExchange('test', 'topic');
            expect(mockChannel.close).to.have.been.calledOnce();
        });
    });
    describe('bindQueue', () => {
        it('should bind exchange', async () => {
            await adapter.connect();
            await adapter.bindQueue('testQueue', 'testExchange', '#');
            expect(mockChannel.queueBind).to.have.been.calledOnce();
        });
        it('should throw if called before connect', async () => {
            await expect(adapter.bindQueue('testQueue', 'testExchange', '#')).to.reject(NotConnectedError);
        });
        it('should default the routing key to #', async () => {
            await adapter.connect();
            await adapter.bindQueue('testQueue', 'testExchange');
            expect(mockChannel.queueBind)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith('testQueue', 'testExchange', '#');
        });
        it('should close channel after binding', async () => {
            await adapter.connect();
            await adapter.bindQueue('testQueue', 'testExchange');
            expect(mockChannel.close).to.have.been.calledOnce();
        });
        it('should be possible to send binding arguments', async () => {
            await adapter.connect();
            await adapter.bindQueue('testQueue', 'testExchange', '#', { 'x-match': 'all' });
            expect(mockChannel.queueBind)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith('testQueue', 'testExchange', '#', { 'x-match': 'all' });
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
                .and.to.have.been.calledWith('test', { noAck: false, exclusive: false, args: undefined });
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
        it('should not resolve cancel promise until message is handled', async () => {
            let messageHandledAt: Date | undefined;
            const callback = async () => {
                await delay(50);
                messageHandledAt = new Date();
            };
            const consumer = await adapter.subscribe('test', { onClose: stub() }, callback);
            const internalCallback = mockChannel.basicConsume.firstCall.lastArg;
            internalCallback({ bodyString: () => '"Hello, world"', properties: {} });
            await consumer.cancel();
            expect(messageHandledAt).to.not.be.undefined();
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
            await expect(adapter.subscribe('test', { onClose: stub() }, () => {})).to.reject(NotConnectedError);
        });
        it('should send subscribe arguments to subscribe', async () => {
            await adapter.subscribe('test', { onClose: stub(), args: { 'x-stream-offset': 'last' } }, () => {});
            expect(mockChannel.basicConsume).to.have.been.calledOnce();
            expect(mockChannel.basicConsume.firstCall.args[1].args).to.partially.eql({ 'x-stream-offset': 'last' });
        });
        it('should close channel when cancelling consumer', async () => {
            const consumer = await adapter.subscribe('test', { onClose: stub() }, () => {});
            await consumer.cancel();
            expect(mockChannel.close).to.have.been.calledOnce();
        });
        it('should close channel if basicConsume throws', async () => {
            mockChannel.basicConsume.throws(new Error('big sad'));
            await expect(adapter.subscribe('test', { onClose: stub() }, () => {})).to.reject();
            expect(mockChannel.close).to.have.been.calledOnce();
        });
    });
    describe('bindExchange', () => {
        it('should bind one exchange to another', async () => {
            await adapter.connect();
            await adapter.bindExchange('testExchange', 'testExchange2', '#');
            expect(mockChannel.exchangeBind).to.have.been.calledOnce();
            expect(mockChannel.exchangeBind).to.have.been.calledWith('testExchange', 'testExchange2', '#');
        });
        it('should close channel after binding', async () => {
            await adapter.connect();
            await adapter.bindExchange('testExchange', 'testExchange2', '#');
            expect(mockChannel.close).to.have.been.calledOnce();
        });
        it('should be possible to send binding arguments', async () => {
            await adapter.connect();
            await adapter.bindExchange('testExchange', 'testExchange2', '#', { 'x-match': 'all' });
            expect(mockChannel.exchangeBind).to.have.been.calledOnce();
            expect(mockChannel.exchangeBind).to.have.been.calledWith('testExchange', 'testExchange2', '#', {
                'x-match': 'all'
            });
        });
        it('should throw if called before connect', async () => {
            await expect(adapter.bindExchange('testExchange', 'testExchange2', '#')).to.reject(NotConnectedError);
        });
        it('should default the routing key to #', async () => {
            await adapter.connect();
            await adapter.bindExchange('testExchange', 'testExchange2');
            expect(mockChannel.exchangeBind)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith('testExchange', 'testExchange2', '#');
        });
    });
    describe('deleteQueue', () => {
        it('should throw if called before connect', async () => {
            await expect(adapter.deleteQueue('test')).to.reject(NotConnectedError);
        });
        it('should delete queue', async () => {
            await adapter.connect();
            await adapter.deleteQueue('test');
            expect(mockChannel.queueDelete).to.have.been.calledOnce();
            expect(mockChannel.queueDelete).to.have.been.calledWith('test');
        });
        it('should close channel after deleting queue', async () => {
            await adapter.connect();
            await adapter.deleteQueue('test');
            expect(mockChannel.close).to.have.been.calledOnce();
        });
        it('should forward ifUnused', async () => {
            await adapter.connect();
            await adapter.deleteQueue('test', { ifUnused: true });
            expect(mockChannel.queueDelete).to.have.been.calledOnce();
            expect(mockChannel.queueDelete).to.have.been.calledWith('test', { ifUnused: true, ifEmpty: false });
        });
        it('should foward ifEmpty', async () => {
            await adapter.connect();
            await adapter.deleteQueue('test', { ifEmpty: true });
            expect(mockChannel.queueDelete).to.have.been.calledOnce();
            expect(mockChannel.queueDelete).to.have.been.calledWith('test', { ifUnused: false, ifEmpty: true });
        });
    });
    describe('deleteExchange', () => {
        it('should throw if called before connect', async () => {
            await expect(adapter.deleteExchange('test')).to.reject(NotConnectedError);
        });
        it('should delete exchange', async () => {
            await adapter.connect();
            await adapter.deleteExchange('test');
            expect(mockChannel.exchangeDelete).to.have.been.calledOnce();
            expect(mockChannel.exchangeDelete).to.have.been.calledWith('test');
        });
        it('should close channel after deleting exchange', async () => {
            await adapter.connect();
            await adapter.deleteExchange('test');
            expect(mockChannel.close).to.have.been.calledOnce();
        });
        it('should forward ifUnused', async () => {
            await adapter.connect();
            await adapter.deleteExchange('test', { ifUnused: true });
            expect(mockChannel.exchangeDelete).to.have.been.calledOnce();
            expect(mockChannel.exchangeDelete).to.have.been.calledWith('test', { ifUnused: true });
        });
    });
    describe('unbindQueue', () => {
        it('should throw if called before connect', async () => {
            await expect(adapter.unbindQueue('testQueue', 'testExchange')).to.reject(NotConnectedError);
        });
        it('should unbind queue', async () => {
            await adapter.connect();
            await adapter.unbindQueue('testQueue', 'testExchange');
            expect(mockChannel.queueUnbind).to.have.been.calledOnce();
            expect(mockChannel.queueUnbind).to.have.been.calledWith('testQueue', 'testExchange', '#');
        });
        it('should close channel after unbinding queue', async () => {
            await adapter.connect();
            await adapter.unbindQueue('testQueue', 'testExchange');
            expect(mockChannel.close).to.have.been.calledOnce();
        });
        it('should default the routing key to #', async () => {
            await adapter.connect();
            await adapter.unbindQueue('testQueue', 'testExchange');
            expect(mockChannel.queueUnbind)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith('testQueue', 'testExchange', '#');
        });
        it('should forward arguments', async () => {
            await adapter.connect();
            await adapter.unbindQueue('testQueue', 'testExchange', '#', { 'x-match': 'all' });
            expect(mockChannel.queueUnbind)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith('testQueue', 'testExchange', '#', { 'x-match': 'all' });
        });
    });
    describe('unbindExchange', () => {
        it('should throw if called before connect', async () => {
            await expect(adapter.unbindExchange('testExchange', 'testExchange2')).to.reject(NotConnectedError);
        });
        it('should unbind exchange', async () => {
            await adapter.connect();
            await adapter.unbindExchange('testExchange', 'testExchange2');
            expect(mockChannel.exchangeUnbind).to.have.been.calledOnce();
            expect(mockChannel.exchangeUnbind).to.have.been.calledWith('testExchange', 'testExchange2', '#');
        });
        it('should close channel after unbinding exchange', async () => {
            await adapter.connect();
            await adapter.unbindExchange('testExchange', 'testExchange2');
            expect(mockChannel.close).to.have.been.calledOnce();
        });
        it('should default the routing key to #', async () => {
            await adapter.connect();
            await adapter.unbindExchange('testExchange', 'testExchange2');
            expect(mockChannel.exchangeUnbind)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith('testExchange', 'testExchange2', '#');
        });
        it('should forward arguments', async () => {
            await adapter.connect();
            await adapter.unbindExchange('testExchange', 'testExchange2', '#', { 'x-match': 'all' });
            expect(mockChannel.exchangeUnbind)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith('testExchange', 'testExchange2', '#', { 'x-match': 'all' });
        });
    });
    describe('purgeQueue', () => {
        it('should throw if called before connect', async () => {
            await expect(adapter.purgeQueue('test')).to.reject(NotConnectedError);
        });
        it('should purge queue', async () => {
            await adapter.connect();
            await adapter.purgeQueue('test');
            expect(mockChannel.queuePurge).to.have.been.calledOnce();
            expect(mockChannel.queuePurge).to.have.been.calledWith('test');
        });
        it('should close channel after purging queue', async () => {
            await adapter.connect();
            await adapter.purgeQueue('test');
            expect(mockChannel.close).to.have.been.calledOnce();
        });
    });
});
