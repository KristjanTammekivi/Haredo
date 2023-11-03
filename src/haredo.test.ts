import { config } from 'dotenv';
import { expect } from 'hein';
import { SinonStub, SinonStubbedInstance, match, spy, stub } from 'sinon';
import { Adapter, Consumer } from './adapter';
import { FailureBackoff } from './backoffs';
import { MissingQueueNameError } from './errors';
import { Exchange } from './exchange';
import { Haredo } from './haredo';
import { makeHaredoMessage } from './haredo-message';
import { Queue } from './queue';
import { HaredoConsumer } from './types';

config();

const rabbitURL = process.env.RABBIT_URL || 'amqp://localhost:5672';

const makeTestMessage = (content: string, { parse = false, queue = 'test' } = {}) =>
    makeHaredoMessage(
        {
            bodyString: () => content,
            properties: {},
            ack: () => {},
            nack: () => {}
        } as any,
        parse,
        queue
    );

describe('haredo', () => {
    let haredo: ReturnType<typeof Haredo>;
    let adapter: SinonStubbedInstance<Adapter>;
    let consumerStub: Consumer;
    beforeEach(async () => {
        adapter = stub({
            connect: () => Promise.resolve(),
            bindQueue: () => Promise.resolve(),
            sendToQueue: () => Promise.resolve(),
            subscribe: () => Promise.resolve(),
            close: () => Promise.resolve(),
            createQueue: () => Promise.resolve(),
            createExchange: () => Promise.resolve(),
            publish: () => Promise.resolve()
        } as any);
        haredo = Haredo({ url: rabbitURL + '/test', adapter });
        adapter.createQueue.resolves('test');
        consumerStub = stub({ cancel: () => Promise.resolve() });
        adapter.subscribe.resolves(consumerStub);
    });
    it('should connect', async () => {
        await haredo.connect();
        expect(adapter.connect).to.have.been.calledOnce();
    });
    it('should disconnect', async () => {
        await haredo.close();
        expect(adapter.close).to.have.been.calledOnce();
    });
    describe('exchange', () => {
        it('should publish to exchange', async () => {
            await haredo.exchange('test', 'direct').publish('some message', 'message.new');
            expect(adapter.publish).to.have.been.calledOnce();
            expect(adapter.publish).to.have.been.calledWith('test', 'message.new', '"some message"');
        });
        it('should publish to confirm channel', async () => {
            await haredo.exchange('test', 'direct').confirm().publish('some message', 'message.new');
            expect(adapter.publish).to.have.been.calledOnce();
            expect(adapter.publish).to.have.been.calledWith('test', 'message.new', '"some message"', {
                contentType: 'application/json',
                confirm: true
            });
        });
        it('should assert exchange', async () => {
            await haredo.exchange('test', 'direct').publish('some message', 'message.new');
            expect(adapter.createExchange).to.have.been.calledOnce().and.to.have.been.calledWith('test');
        });
        it('should accept an exchange object', async () => {
            await haredo.connect();
            await haredo.exchange(Exchange('test', 'topic')).publish('some message', 'message.new');
            expect(adapter.publish).to.have.been.calledOnce();
            expect(adapter.publish).to.have.been.calledWith('test', 'message.new', '"some message"');
        });
        it('should stringify objects', async () => {
            await haredo.exchange('test', 'direct').publish({ id: '123' }, 'message.new');
            expect(adapter.publish).to.have.been.calledOnce();
            expect(adapter.publish).to.have.been.calledWith('test', 'message.new', '{"id":"123"}', {
                contentType: 'application/json',
                confirm: false
            });
        });
        it('should accept typed exchanges', async () => {
            await haredo.connect();
            await haredo.exchange(Exchange<{ id: string }>('test', 'direct')).publish({ id: '5' }, 'message.new');
            // @ts-expect-error - should be string
            await haredo.exchange(Exchange<{ id: string }>('test', 'direct')).publish({ id: 5 }, 'message.new');
        });
        it('should create the exchange with required type when providing a string', async () => {
            await haredo.exchange('test', 'fanout').setup();
            expect(adapter.createExchange).to.have.been.calledOnce();
            expect(adapter.createExchange).to.have.been.calledWith('test', 'fanout');
        });
        it('should not setup if skipSetup is called', async () => {
            await haredo.exchange('test', 'fanout').skipSetup().publish('test', '#');
            expect(adapter.createExchange).to.not.have.been.called();
        });
        it('should not stringify message if .json(false) is called', async () => {
            await haredo.exchange('test', 'fanout').json(false).publish('hello, world', 'message.new');
            expect(adapter.publish)
                .to.have.been.calledOnce()
                .and.to.have.been.calledWith('test', 'message.new', 'hello, world');
        });
        it('should publish with a delay header when .delay is called', async () => {
            await haredo.exchange('someExchange', 'topic').delay(1234).publish('some message', 'rk');
            expect(adapter.publish).to.have.been.calledWith('someExchange', 'rk', '"some message"', {
                confirm: false,
                contentType: 'application/json',
                headers: {
                    'x-delay': 1234
                }
            });
        });
        it('should be possible to set parameters when creating exchange via string', async () => {
            await haredo.exchange('someExchange', 'topic', { passive: true }).publish('some message', 'rk');
            expect(adapter.createExchange).to.have.been.calledWith('someExchange', 'topic', { passive: true });
        });
        it('should be possible to set arguments when creating exchange via string', async () => {
            await haredo
                .exchange('someExchange', 'x-delayed-message', {}, { 'x-delayed-type': 'topic' })
                .publish('some message', 'rk');
            expect(adapter.createExchange).to.have.been.calledWith(
                'someExchange',
                'x-delayed-message',
                {},
                { 'x-delayed-type': 'topic' }
            );
        });
        it('should be possible to set an argument', async () => {
            await haredo
                .exchange('someExchange', 'topic')
                .setArgument('messageId', 'someMessage')
                .publish('some message', 'rk');
            expect(adapter.publish).to.have.been.calledOnce();
            expect(adapter.publish).to.have.been.calledWith('someExchange', 'rk', '"some message"', {
                messageId: 'someMessage',
                confirm: false,
                contentType: 'application/json'
            });
        });
        it('should be possible to set multiple arguments', async () => {
            await haredo
                .exchange('someExchange', 'topic')
                .setArgument('deliveryMode', 1)
                .setArgument('messageId', 'someMessage')
                .publish('some message', 'rk');
            expect(adapter.publish).to.have.been.calledOnce();
            expect(adapter.publish).to.have.been.calledWith('someExchange', 'rk', '"some message"', {
                messageId: 'someMessage',
                deliveryMode: 1,
                confirm: false,
                contentType: 'application/json'
            });
        });
        it('should be possible to set message type', async () => {
            await haredo.exchange('someExchange', 'topic').type('testmessagetype').publish('some message', 'rk');
            expect(adapter.publish).to.have.been.calledOnce();
            expect(adapter.publish).to.have.been.calledWith('someExchange', 'rk', '"some message"', {
                type: 'testmessagetype',
                confirm: false,
                contentType: 'application/json'
            });
        });
        it('should use appId when set', async () => {
            const rabbit = Haredo({ url: rabbitURL + '/test', adapter, appId: 'myApp' });
            await rabbit.exchange('someExchange', 'topic').publish('some message', 'rk');
            expect(adapter.publish).to.have.been.calledOnce();
            expect(adapter.publish).to.have.been.calledWith('someExchange', 'rk', '"some message"', {
                appId: 'myApp',
                confirm: false,
                contentType: 'application/json'
            });
        });
    });
    describe('queue', () => {
        describe('publish', () => {
            it('should publish to queue', async () => {
                await haredo.connect();
                await haredo.queue('test').publish('some message');
                expect(adapter.sendToQueue).to.have.been.calledOnce();
                expect(adapter.sendToQueue).to.have.been.calledWith('test', '"some message"');
            });
            it('should accept a queue object', async () => {
                await haredo.connect();
                await haredo.queue(Queue('test')).publish('some message');
                expect(adapter.sendToQueue).to.have.been.calledOnce();
                expect(adapter.sendToQueue).to.have.been.calledWith('test', '"some message"');
            });
            it('should reject when publishing to an anonymous queue with skipSetup', async () => {
                await haredo.connect();
                await expect(haredo.queue(Queue()).skipSetup().publish('hello')).to.reject(MissingQueueNameError);
            });
            it('should stringify objects', async () => {
                await haredo.connect();
                await haredo.queue('test').publish({ id: '123' });
                expect(adapter.sendToQueue).to.have.been.calledOnce();
                expect(adapter.sendToQueue).to.have.been.calledWith('test', '{"id":"123"}', {
                    contentType: 'application/json',
                    confirm: false
                });
            });
            it('should setup queue when publishing', async () => {
                await haredo.connect();
                await haredo.queue('test').publish('some message');
                expect(adapter.createQueue).to.have.been.calledOnce();
                expect(adapter.createQueue).to.have.been.calledWith('test');
            });
            it('should setup queue params without an object', async () => {
                await haredo.connect();
                await haredo.queue('test', { autoDelete: true }).publish('some message');
                expect(adapter.createQueue).to.have.been.calledOnce();
                expect(adapter.createQueue).to.have.been.calledWith('test', { autoDelete: true });
            });
            it('should setup queue arguments without an object', async () => {
                await haredo.connect();
                await haredo.queue('test', {}, { 'x-dead-letter-exchange': 'dlx' }).publish('some message');
                expect(adapter.createQueue).to.have.been.calledOnce();
                expect(adapter.createQueue).to.have.been.calledWith('test', {}, { 'x-dead-letter-exchange': 'dlx' });
            });
            it('should accept typed queues', async () => {
                const queue = Queue<{ id: string }>('test');
                await haredo.queue(queue).publish({ id: '123' });
                // @ts-expect-error - should not accept wrong type
                await haredo.queue(queue).publish({ id: 123 });
            });
            it('should accept typed exchanges', async () => {
                const exchange = Exchange<{ id: string }>('test', 'direct');
                await haredo
                    .queue('test')
                    .bindExchange(exchange, 'message.created')
                    .subscribe(async ({ id }) => {});
                await haredo
                    .queue('test')
                    .bindExchange(exchange, 'message.created')
                    // @ts-expect-error - should not accept wrong type
                    .subscribe(async ({ kd }) => {});
            });
            it('should use confirm channels if .confirm is called', async () => {
                await haredo.queue('test').confirm().publish('some message');
                expect(adapter.sendToQueue.firstCall.args[2]).to.partially.eql({
                    confirm: true
                });
            });
            it('should not stringify if .json(false) is called', async () => {
                await haredo.queue('test').json(false).publish('testmessage');
                expect(adapter.sendToQueue).to.have.been.calledOnce();
                expect(adapter.sendToQueue).to.have.been.calledWith('test', 'testmessage');
            });
            it('should be possible to set an argument', async () => {
                await haredo.queue('test').setPublishArgument('expiration', '1000').publish('testmessage');
                expect(adapter.sendToQueue).to.have.been.calledOnce();
                expect(adapter.sendToQueue).to.have.been.calledWith('test', '"testmessage"', {
                    expiration: '1000',
                    confirm: false,
                    contentType: 'application/json'
                });
            });
            it('should be possible to set multiple arguments', async () => {
                await haredo
                    .queue('test')
                    .setPublishArgument('expiration', '1000')
                    .setPublishArgument('appId', 'test')
                    .publish('testmessage');
                expect(adapter.sendToQueue).to.have.been.calledOnce();
                expect(adapter.sendToQueue).to.have.been.calledWith('test', '"testmessage"', {
                    expiration: '1000',
                    appId: 'test',
                    confirm: false,
                    contentType: 'application/json'
                });
            });
            it('should set message type', async () => {
                await haredo.queue('test').type('testmessagetype').publish('testmessage');
                expect(adapter.sendToQueue).to.have.been.calledOnce();
                expect(adapter.sendToQueue).to.have.been.calledWith('test', '"testmessage"', {
                    type: 'testmessagetype',
                    confirm: false,
                    contentType: 'application/json'
                });
            });
            it('should send appId when set', async () => {
                const rabbit = Haredo({ url: rabbitURL + '/test', adapter, appId: 'myApp' });
                await rabbit.queue('test').publish('testmessage');
                expect(adapter.sendToQueue).to.have.been.calledOnce();
                expect(adapter.sendToQueue).to.have.been.calledWith('test', '"testmessage"', {
                    appId: 'myApp',
                    confirm: false,
                    contentType: 'application/json'
                });
            });
        });
        describe('subscribe', () => {
            beforeEach(async () => {
                await haredo.connect();
            });
            it('should setup queue when subscribing', async () => {
                await haredo.queue('test').subscribe(() => {});
                expect(adapter.createQueue).to.have.been.calledOnce();
                expect(adapter.createQueue).to.have.been.calledWith('test');
            });
            it('should setup exchange when binding and subscribing', async () => {
                await haredo
                    .queue('test')
                    .bindExchange('testexchange', '#', 'topic')
                    .subscribe(() => {});
                expect(adapter.createExchange).to.have.been.calledOnce();
                expect(adapter.createExchange).to.have.been.calledWith('testexchange', 'topic');
                expect(adapter.bindQueue).to.have.been.calledOnce();
                expect(adapter.bindQueue).to.have.been.calledWith('test', 'testexchange', '#');
            });
            it('should setup exchange when it is passed as an object', async () => {
                await haredo
                    .queue('test')
                    .bindExchange(Exchange('testexchange', 'direct'), 'message.created')
                    .subscribe(async () => {});
                expect(adapter.createExchange).to.have.been.calledOnce();
                expect(adapter.createExchange).to.have.been.calledWith('testexchange', 'direct');
                expect(adapter.bindQueue).to.have.been.calledOnce();
                expect(adapter.bindQueue).to.have.been.calledWith('test', 'testexchange', 'message.created');
            });

            it('should pass exchange arguments when creating exchange', async () => {
                await haredo
                    .queue('test')
                    .bindExchange(Exchange('testexchange', 'topic').delayed(), 'message.created')
                    .subscribe(async () => {});
                expect(adapter.createExchange).to.have.been.calledOnce();
                expect(adapter.createExchange).to.have.been.calledWith(
                    'testexchange',
                    'x-delayed-message',
                    {},
                    {
                        'x-delayed-type': 'topic'
                    }
                );
            });
            it('should not attempt to create an exchange twice when passing in an array of two patterns for binding', async () => {
                await haredo
                    .queue('test')
                    .bindExchange(Exchange('testexchange', 'topic'), ['message.created', 'message.updated'])
                    .subscribe(async () => {});
                expect(adapter.createExchange).to.have.been.calledOnce();
            });
            it('should throw when subscribing with an anonymous queue and skipSetup is not called', async () => {
                await expect(
                    haredo
                        .queue(Queue())
                        .skipSetup()
                        .subscribe(() => {})
                ).to.reject(MissingQueueNameError);
            });
            it('should call callback on message', async () => {
                const callback = stub();
                await haredo.queue('test').subscribe(callback);
                const message = makeTestMessage('test');
                await adapter.subscribe.firstCall.lastArg(message);
                expect(callback).to.have.been.calledOnce();
                expect(callback).to.have.been.calledWith(message.data, message);
            });
            it('should resubscribe on connection error', async () => {
                await haredo.queue('test').subscribe(() => {});
                const { onClose } = adapter.subscribe.firstCall.args[1];
                onClose(new Error('test'));
                expect(adapter.subscribe).to.have.been.calledTwice();
            });
            it('should call cancel on consumer', async () => {
                const consumer = await haredo.queue('test').subscribe(() => {});
                await consumer.cancel();
                expect(consumerStub.cancel).to.have.been.calledOnce();
            });
            it('should not resubscribe when consumer is cancelled', async () => {
                const consumer = await haredo.queue('test').subscribe(() => {});
                await consumer.cancel();
                const { onClose } = adapter.subscribe.firstCall.args[1];
                onClose(new Error('test'));
                expect(adapter.subscribe).to.have.been.calledOnce();
            });
            it('should not resubscribe when connection is closed', async () => {
                await haredo.queue('test').subscribe(() => {});
                adapter.subscribe.firstCall.args[1].onClose(null);
                expect(adapter.subscribe).to.have.been.calledOnce();
            });
            it('should set prefetch', async () => {
                await haredo
                    .queue('test')
                    .prefetch(5)
                    .subscribe(() => {});
                await haredo
                    .queue('test')
                    .concurrency(4)
                    .subscribe(() => {});
                expect(adapter.subscribe).to.have.been.calledTwice();
                expect(adapter.subscribe.firstCall.args[1]).to.partially.eql({ prefetch: 5 });
                expect(adapter.subscribe.secondCall.args[1]).to.partially.eql({ prefetch: 4 });
            });
            it('should not setup if skipSetup is called', async () => {
                await haredo
                    .queue('test')
                    .skipSetup()
                    .subscribe(() => {});
                expect(adapter.createQueue).to.not.have.been.called();
            });
            it('should call middleware with the message', async () => {
                const middleware = stub().resolves();
                await haredo
                    .queue('test')
                    .use(middleware)
                    .subscribe(() => {});
                const message = makeTestMessage('some message');
                await adapter.subscribe.firstCall.lastArg(message);
                expect(middleware).to.have.been.calledOnce();
                expect(middleware).to.have.been.calledWith(message, match.func);
            });
            it('should add multiple middleware in order', async () => {
                const middleware1 = stub().resolves();
                const middleware2 = stub().resolves();
                await haredo
                    .queue('test')
                    .use(middleware1)
                    .use(middleware2)
                    .subscribe(() => {});
                const message = makeTestMessage('some message');
                await adapter.subscribe.firstCall.lastArg(message);
                expect(middleware1).to.have.been.calledOnce();
                expect(middleware1).to.have.been.calledWith(message, match.func);
                expect(middleware2).to.have.been.calledOnce();
                expect(middleware2).to.have.been.calledWith(message, match.func);
                expect(middleware1).to.have.been.calledBefore(middleware2);
            });
            it(`should call ack when callback passes`, async () => {
                const callback = stub();
                await haredo.queue('test').subscribe(callback);
                const message = spy(makeTestMessage('some message'));
                await adapter.subscribe.firstCall.lastArg(message);
                expect(message.ack).to.have.been.calledOnce();
            });
            it(`should call nack when callback throws`, async () => {
                const callback = stub().throws(new Error('fail'));
                await haredo.queue('test').subscribe(callback);
                const message = spy(makeTestMessage('some message'));
                await adapter.subscribe.firstCall.lastArg(message);
                expect(message.nack).to.have.been.calledOnce();
                expect(message.nack).to.have.been.calledWith(false);
            });
        });
        describe('backoff', () => {
            let backoff: SinonStubbedInstance<FailureBackoff>;
            let chain: HaredoConsumer;
            let subscribeCallback: SinonStub;
            beforeEach(async () => {
                backoff = stub({
                    take: () => Promise.resolve(),
                    ack: () => {},
                    nack: () => {},
                    pass: () => {},
                    fail: () => {}
                } as FailureBackoff);
                subscribeCallback = stub();
                chain = await haredo.queue('test').backoff(backoff).subscribe(subscribeCallback);
            });
            afterEach(async () => {
                await chain.cancel();
            });
            it('should take from backoff', async () => {
                await adapter.subscribe.firstCall.lastArg(makeTestMessage('test'));
                expect(backoff.take).to.have.been.calledOnce();
            });
            it('should call pass on backoff when callback resolves', async () => {
                await adapter.subscribe.firstCall.lastArg(makeTestMessage('test'));
                expect(backoff.pass).to.have.been.calledOnce();
            });
            it('should call fail on backoff when callback throws', async () => {
                subscribeCallback.throws(new Error('fail'));
                await adapter.subscribe.firstCall.lastArg(makeTestMessage('test'));
                expect(backoff.fail).to.have.been.calledOnce();
            });
            it('should call ack on backoff when a message is acked', async () => {
                await haredo
                    .queue('test')
                    .backoff(backoff)
                    .subscribe(async (message, info) => {
                        await info.ack();
                    });
                await adapter.subscribe.secondCall.lastArg(makeTestMessage('test'));
                expect(backoff.ack).to.have.been.calledOnce();
            });
            it('should call nack on backoff when a message is nacked', async () => {
                await haredo
                    .queue('test')
                    .backoff(backoff)
                    .subscribe(async (message, info) => {
                        await info.nack(false);
                    });
                await adapter.subscribe.secondCall.lastArg(makeTestMessage('test'));
                expect(backoff.nack).to.have.been.calledOnce();
                expect(backoff.nack).to.have.been.calledWith(false);
            });
        });
        describe('stream', () => {
            it('should set streamOffset', async () => {
                await haredo
                    .queue('test', undefined, { 'x-queue-type': 'stream' })
                    .streamOffset('last')
                    .subscribe(() => {});
                expect(adapter.subscribe).to.have.been.calledOnce();
                expect(adapter.subscribe.firstCall.args[1]).to.partially.eql({
                    args: {
                        'x-stream-offset': 'last'
                    }
                });
            });
            it('should set streamOffset to timestamp when Date is passed', async () => {
                const date = new Date();
                await haredo
                    .queue('test', undefined, { 'x-queue-type': 'stream' })
                    .streamOffset(date)
                    .subscribe(() => {});
                expect(adapter.subscribe).to.have.been.calledOnce();
                expect(adapter.subscribe.firstCall.args[1]).to.partially.eql({
                    args: {
                        'x-stream-offset': date
                    }
                });
            });
        });
    });
    describe('extend', () => {
        it('should be possible to extend haredo queue chain', async () => {
            const extendedHaredo = Haredo({
                url: 'amqp://localhost:5672',
                extensions: [
                    {
                        name: 'cid',
                        queue: (state) => (cid: string) => {
                            return {
                                ...state,
                                headers: {
                                    ...state.headers,
                                    'x-cid': cid
                                }
                            };
                        }
                    }
                ],
                adapter
            });
            await extendedHaredo.connect();
            await (extendedHaredo.queue('test') as any).cid('123').publish('test');
            expect(adapter.sendToQueue).to.have.been.calledOnce();
            expect(adapter.sendToQueue).to.have.been.calledWith('test', '"test"', {
                confirm: false,
                contentType: 'application/json',
                headers: {
                    'x-cid': '123'
                }
            });
        });
        it('should be possible to extend haredo exchange chain', async () => {
            const extendedHaredo = Haredo({
                url: 'amqp://localhost:5672',
                extensions: [
                    {
                        name: 'cid',
                        exchange: (state) => (cid: string) => {
                            return {
                                ...state,
                                headers: {
                                    ...state.headers,
                                    'x-cid': cid
                                }
                            };
                        }
                    }
                ],
                adapter
            });
            await extendedHaredo.connect();
            await (extendedHaredo.exchange('test', 'topic') as any).cid('123').publish('test', 'rk');
            expect(adapter.publish).to.have.been.calledOnce();
            expect(adapter.publish).to.have.been.calledWith('test', 'rk', '"test"', {
                confirm: false,
                contentType: 'application/json',
                headers: {
                    'x-cid': '123'
                }
            });
        });
    });
    describe('globalMiddleware', () => {
        it('should add global middleware', async () => {
            const middleware = stub().resolves();
            const h = Haredo({
                url: 'amqp://localhost:5672',
                adapter,
                globalMiddleware: [middleware]
            });
            await h.connect();
            await h.queue('test').subscribe(() => {});
            const message = makeTestMessage('some message');
            await adapter.subscribe.firstCall.lastArg(message);
            expect(middleware).to.have.been.calledOnce();
        });
    });
});

// TODO: [>3.0.0] - make sure this isn't leaking
// declare module './types' {
//     interface QueueChain<T = unknown> {
//         cid(cid: string): this;
//     }
//     interface ExchangeChain<T = unknown> {
//         cid(cid: string): this;
//     }
// }
