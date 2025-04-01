import { config } from 'dotenv';
import { expect } from 'hein';
import { SinonSpy, SinonStub, SinonStubbedInstance, match, spy, stub } from 'sinon';
import { FailureBackoff } from './backoffs';
import { MissingQueueNameError } from './errors';
import { Exchange } from './exchange';
import { Haredo } from './haredo';
import { makeHaredoMessage } from './haredo-message';
import { Queue } from './queue';
import { HaredoConsumer, Adapter, AdapterEvents, Consumer, QueueChain, ExchangeChain } from './types';
import { TypedEventEmitter } from './utils/typed-event-emitter';
import { AMQPError } from '@cloudamqp/amqp-client';

config();

const rabbitURL = process.env.RABBIT_URL || 'amqp://localhost:5672';

const makeTestMessage = (content: string, { parse = false, queue = 'test' } = {}) => {
    return makeHaredoMessage(
        {
            bodyString: () => content,
            properties: {},
            ack: () => {},
            nack: () => {}
        } as any,
        parse,
        queue
    );
};

describe('haredo', () => {
    let haredo: ReturnType<typeof Haredo>;
    let adapter: SinonStubbedInstance<Adapter>;
    let consumerStub: Consumer;
    let logSpy: SinonSpy;

    beforeEach(async () => {
        logSpy = spy();
        adapter = stub({
            bindExchange: () => Promise.resolve(),
            bindQueue: () => Promise.resolve(),
            close: () => Promise.resolve(),
            connect: () => Promise.resolve(),
            createExchange: () => Promise.resolve(),
            createQueue: () => Promise.resolve(),
            deleteExchange: () => Promise.resolve(),
            deleteQueue: () => Promise.resolve(),
            publish: () => Promise.resolve(),
            purgeQueue: () => Promise.resolve(),
            sendToQueue: () => Promise.resolve(),
            subscribe: () => Promise.resolve(),
            unbindExchange: () => Promise.resolve(),
            unbindQueue: () => Promise.resolve()
        } as any);
        adapter.emitter = new TypedEventEmitter<AdapterEvents>();
        haredo = Haredo({ url: rabbitURL + '/test', adapter, log: logSpy });
        adapter.createQueue.callsFake(async (x) => x || 'amq.test');
        consumerStub = stub({ cancel: () => Promise.resolve() });
        adapter.subscribe.resolves(consumerStub);
    });

    it('should connect', async () => {
        await haredo.connect();
        expect(adapter.connect).to.have.been.calledOnce();
    });

    it('should autoconnect if flag is set', () => {
        adapter.connect.resetHistory();
        haredo = Haredo({ url: rabbitURL + '/test', adapter, autoConnect: true, log: logSpy });
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
            const rabbit = Haredo({ url: rabbitURL + '/test', adapter, defaults: { appId: 'myApp' } });
            await rabbit.exchange('someExchange', 'topic').publish('some message', 'rk');
            expect(adapter.publish).to.have.been.calledOnce();
            expect(adapter.publish).to.have.been.calledWith('someExchange', 'rk', '"some message"', {
                appId: 'myApp',
                confirm: false,
                contentType: 'application/json'
            });
        });

        it('should set up E2E bindings', async () => {
            await haredo
                .exchange('someExchange', 'topic')
                .bindExchange('someOtherExchange', 'rk', 'topic')
                .publish('some message', 'rk');
            expect(adapter.createExchange).to.have.been.calledTwice();
            expect(adapter.createExchange).to.have.been.calledWith('someExchange');
            expect(adapter.createExchange).to.have.been.calledWith('someOtherExchange');
            expect(adapter.bindExchange).to.have.been.calledOnce();
            expect(adapter.bindExchange).to.have.been.calledWith('someExchange', 'someOtherExchange', 'rk');
        });

        it('should create the exchange when skipSetup is called with { skipCreate: false }', async () => {
            await haredo
                .exchange('someExchange', 'topic')
                .skipSetup({ skipCreate: false })
                .bindExchange('someOtherExchange', 'rk', 'topic')
                .publish('some message', 'rk');
            expect(adapter.createExchange).to.have.been.calledOnce();
            expect(adapter.createExchange).to.have.been.calledWith('someExchange');
        });

        it('should create the bound exchange when skipSetup is called with { skipBoundExchanges: false }', async () => {
            await haredo
                .exchange('someExchange', 'topic')
                .skipSetup({ skipBoundExchanges: false })
                .bindExchange('someOtherExchange', 'rk', 'topic')
                .publish('some message', 'rk');
            expect(adapter.createExchange).to.have.been.calledOnce();
            expect(adapter.createExchange).to.have.been.calledWith('someOtherExchange');
        });

        it('should create the bindings when skipSetup is called with { skipBindings: false }', async () => {
            await haredo
                .exchange('someExchange', 'topic')
                .skipSetup({ skipBindings: false })
                .bindExchange('someOtherExchange', 'rk', 'topic')
                .publish('some message', 'rk');
            expect(adapter.bindExchange).to.have.been.calledOnce();
            expect(adapter.bindExchange).to.have.been.calledWith('someExchange', 'someOtherExchange', 'rk');
        });

        it('should be possible to bind an exchange object', async () => {
            await haredo
                .exchange('someExchange', 'topic')
                .bindExchange(Exchange('someOtherExchange', 'topic'), 'rk')
                .publish('some message', 'rk');
            expect(adapter.bindExchange).to.have.been.calledOnce();
            expect(adapter.bindExchange).to.have.been.calledWith('someExchange', 'someOtherExchange', 'rk');
        });

        it('should set a default concurrency', async () => {
            haredo = Haredo({ url: rabbitURL + '/test', adapter, defaults: { concurrency: 5 } });
            await haredo.connect();
            await haredo.queue('testQueue').subscribe(() => {});
            expect(adapter.subscribe).to.have.been.calledOnce();
            expect(adapter.subscribe.firstCall.args[1]).to.partially.eql({ prefetch: 5 });
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
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    .subscribe(async ({ id }) => {});
                await haredo
                    .queue('test')
                    .bindExchange(exchange, 'message.created')
                    // @ts-expect-error - should not accept wrong type
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                const rabbit = Haredo({ url: rabbitURL + '/test', adapter, defaults: { appId: 'myApp' } });
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

            it('should create multiple bindings when passed an array of patterns', async () => {
                await haredo
                    .queue('test')
                    .bindExchange(Exchange('testexchange', 'topic'), ['message.created', 'message.updated'])
                    .subscribe(async () => {});
                expect(adapter.bindQueue).to.have.been.calledTwice();
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

            it('should create the queue when skipSetup is called with { skipCreate: false }', async () => {
                await haredo
                    .queue('test')
                    .skipSetup({ skipCreate: false })
                    .bindExchange('testexchange', '#', 'topic')
                    .subscribe(() => {});
                expect(adapter.createQueue).to.have.been.calledOnce();
            });

            it('should create the bound exchange when skipSetup is called with { skipBoundExchanges: false }', async () => {
                await haredo
                    .queue('test')
                    .skipSetup({ skipBoundExchanges: false })
                    .bindExchange('testexchange', '#', 'topic')
                    .subscribe(() => {});
                expect(adapter.createExchange).to.have.been.calledOnce();
            });

            it('should create the bindings when skipSetup is called with { skipBindings: false }', async () => {
                await haredo
                    .queue('test')
                    .skipSetup({ skipBindings: false })
                    .bindExchange('testexchange', '#', 'topic')
                    .subscribe(() => {});
                expect(adapter.bindQueue).to.have.been.calledOnce();
            });

            it('should not create the the bound exchange when skipSetup is called with { skipCreate: false }', async () => {
                await haredo
                    .queue('test')
                    .skipSetup({ skipCreate: true })
                    .bindExchange('testexchange', '#', 'topic')
                    .subscribe(() => {});
                expect(adapter.createExchange).to.not.have.been.called();
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
                expect(message.nack).to.have.been.calledWith(true);
            });

            it('should call adapter with parseJson false if it is set to false', async () => {
                await haredo
                    .queue('test')
                    .json(false)
                    .subscribe(() => {});
                expect(adapter.subscribe).to.have.been.calledOnce();
                expect(adapter.subscribe.firstCall.args[1]).to.partially.eql({ parseJson: false });
            });

            it('should call adapter with noAck true if it is set to true', async () => {
                await haredo
                    .queue('test')
                    .noAck()
                    .subscribe(() => {});
                expect(adapter.subscribe).to.have.been.calledOnce();
                expect(adapter.subscribe.firstCall.args[1]).to.partially.eql({ noAck: true });
            });

            it('should call adapter with exclusive true if it is set to true', async () => {
                await haredo
                    .queue('test')
                    .exclusive()
                    .subscribe(() => {});
                expect(adapter.subscribe).to.have.been.calledOnce();
                expect(adapter.subscribe.firstCall.args[1]).to.partially.eql({ exclusive: true });
            });

            it('should log an error when automatic acking throws an error', async () => {
                await haredo.queue('test').subscribe(() => {});
                const message = stub(makeTestMessage('some message'));
                const error = new AMQPError('Channel is closed', {} as any);
                message.ack.rejects(error);
                logSpy.resetHistory();
                await adapter.subscribe.firstCall.lastArg(message);
                expect(logSpy).to.have.been.calledOnce();
                expect(logSpy.firstCall.firstArg).to.partially.eql({
                    level: 'error',
                    message: 'Error acking message',
                    error
                });
            });

            it('should log an error when automatic nacking throws an error', async () => {
                await haredo.queue('test').subscribe(async () => {
                    throw new Error('Fail');
                });
                const message = stub(makeTestMessage('some message'));
                const error = new AMQPError('Channel is closed', {} as any);
                message.nack.rejects(error);
                logSpy.resetHistory();
                await adapter.subscribe.firstCall.lastArg(message);
                expect(logSpy).to.have.been.calledTwice();
                expect(logSpy.secondCall.firstArg).to.partially.eql({
                    level: 'error',
                    message: 'Error nacking message',
                    error
                });
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
        interface Extension {
            queue: {
                /** Add cid to publishing */
                cid<T>(cid: string): QueueChain<T>;
            };
            exchange: {
                /** Add cid to publishing */
                cid<T>(cid: string): ExchangeChain<T>;
            };
        }

        it('should be possible to extend haredo queue chain', async () => {
            const extendedHaredo = Haredo<Extension>({
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
            await extendedHaredo.queue('test').cid('123').publish('test');
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
            const extendedHaredo = Haredo<Extension>({
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
            await extendedHaredo.exchange('test', 'topic').cid('123').publish('test', 'rk');
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

    describe('priority', () => {
        it('should set message priority on queue chain', async () => {
            await haredo.queue('test').priority(1).publish('test');
            expect(adapter.sendToQueue).to.have.been.calledOnce();
            expect(adapter.sendToQueue).to.have.been.calledWith('test', '"test"', {
                confirm: false,
                contentType: 'application/json',
                priority: 1
            });
        });

        it('should set message priority on exchange chain', async () => {
            await haredo.exchange('test', 'topic').priority(1).publish('test', 'rk');
            expect(adapter.publish).to.have.been.calledOnce();
            expect(adapter.publish).to.have.been.calledWith('test', 'rk', '"test"', {
                confirm: false,
                contentType: 'application/json',
                priority: 1
            });
        });
    });

    describe('setHeader', () => {
        it('should set header for queue chain', async () => {
            await haredo.queue('test').setHeader('test', 'value').publish('test');
            expect(adapter.sendToQueue).to.have.been.calledOnce();
            expect(adapter.sendToQueue).to.have.been.calledWith('test', '"test"', {
                confirm: false,
                contentType: 'application/json',
                headers: {
                    test: 'value'
                }
            });
        });

        it('should set header for exchange chain', async () => {
            await haredo.exchange('test', 'topic').setHeader('test', 'value').publish('test', 'rk');
            expect(adapter.publish).to.have.been.calledOnce();
            expect(adapter.publish).to.have.been.calledWith('test', 'rk', '"test"', {
                confirm: false,
                contentType: 'application/json',
                headers: {
                    test: 'value'
                }
            });
        });
    });

    describe('expiration', () => {
        it('should set message ttl on queue chain', async () => {
            await haredo.queue('test').expiration(1000).publish('test');
            expect(adapter.sendToQueue).to.have.been.calledOnce();
            expect(adapter.sendToQueue).to.have.been.calledWith('test', '"test"', {
                confirm: false,
                contentType: 'application/json',
                expiration: '1000'
            });
        });

        it('should set message ttl on exchange chain', async () => {
            await haredo.exchange('test', 'topic').expiration(1000).publish('test', 'rk');
            expect(adapter.publish).to.have.been.calledOnce();
            expect(adapter.publish).to.have.been.calledWith('test', 'rk', '"test"', {
                confirm: false,
                contentType: 'application/json',
                expiration: '1000'
            });
        });
    });

    describe('bindExchange', () => {
        it('should forward binding arguments to adapter when binding to a queue', async () => {
            await haredo
                .queue('test')
                .bindExchange('testexchange', 'rk', 'topic', {}, {}, { 'x-match': 'any' })
                .setup();
            expect(adapter.bindQueue).to.have.been.calledOnce();
            expect(adapter.bindQueue).to.have.been.calledWith('test', 'testexchange', 'rk', { 'x-match': 'any' });
        });

        it('should forward binding arguments to adapter when binding to an exchange', async () => {
            await haredo
                .exchange('testexchange', 'topic')
                .bindExchange('testexchange2', 'rk', 'topic', {}, {}, { 'x-match': 'any' })
                .setup();
            expect(adapter.bindExchange).to.have.been.calledOnce();
            expect(adapter.bindExchange).to.have.been.calledWith('testexchange', 'testexchange2', 'rk', {
                'x-match': 'any'
            });
        });

        it('should forward binding arguments to adapter when binding an exchange to an exchange object', async () => {
            const exchange = Exchange('testexchange2', 'topic');
            await haredo.exchange('testexchange', 'topic').bindExchange(exchange, 'rk', { 'x-match': 'any' }).setup();
            expect(adapter.bindExchange).to.have.been.calledOnce();
            expect(adapter.bindExchange).to.have.been.calledWith('testexchange', 'testexchange2', 'rk', {
                'x-match': 'any'
            });
        });

        it('should forward binding arguments to adapter when binding a queue to an exchange object', async () => {
            const exchange = Exchange('testexchange2', 'topic');
            await haredo.queue('test').bindExchange(exchange, 'rk', { 'x-match': 'any' }).setup();
            expect(adapter.bindQueue).to.have.been.calledOnce();
            expect(adapter.bindQueue).to.have.been.calledWith('test', 'testexchange2', 'rk', {
                'x-match': 'any'
            });
        });

        it('should forward binding arguments to adapter when binding a queue to a headers exchange with an empty array', async () => {
            await haredo
                .queue('testqueue')
                .bindExchange('testexchange', [], 'headers', {}, {}, { 'x-match': 'all' })
                .setup();
            expect(adapter.bindQueue).to.have.been.calledOnce();
            expect(adapter.bindQueue).to.have.been.calledWith('testqueue', 'testexchange', '#', {
                'x-match': 'all'
            });
        });
    });

    describe('delete', () => {
        it('should delete queue', async () => {
            await haredo.queue('test').delete();
            expect(adapter.deleteQueue).to.have.been.calledOnce();
            expect(adapter.deleteQueue).to.have.been.calledWith('test');
        });

        it('should throw on anonymous queues', async () => {
            await expect(haredo.queue(Queue()).delete()).to.reject(MissingQueueNameError);
        });

        it('should forward delete arguments to adapter', async () => {
            await haredo.queue('test').delete({ ifEmpty: true, ifUnused: true });
            expect(adapter.deleteQueue).to.have.been.calledOnce();
            expect(adapter.deleteQueue).to.have.been.calledWith('test', { ifEmpty: true, ifUnused: true });
        });

        it('should delete exchange', async () => {
            await haredo.exchange('test', 'topic').delete();
            expect(adapter.deleteExchange).to.have.been.calledOnce();
            expect(adapter.deleteExchange).to.have.been.calledWith('test');
        });

        it('should forward delete arguments to adapter on delete exchange', async () => {
            await haredo.exchange('test', 'topic').delete({ ifUnused: true });
            expect(adapter.deleteExchange).to.have.been.calledOnce();
            expect(adapter.deleteExchange).to.have.been.calledWith('test', { ifUnused: true });
        });
    });

    describe('purge', () => {
        it('should purge queue', async () => {
            await haredo.queue('test').purge();
            expect(adapter.purgeQueue).to.have.been.calledOnce();
            expect(adapter.purgeQueue).to.have.been.calledWith('test');
        });

        it('should throw on anonymous queues', async () => {
            await expect(haredo.queue(Queue()).purge()).to.reject(MissingQueueNameError);
        });
    });

    describe('unbindExchange', () => {
        it('should unbind a queue', async () => {
            await haredo.queue('test').unbindExchange('testexchange', '', { 'x-match': 'any' });
            expect(adapter.unbindQueue).to.have.been.calledOnce();
            expect(adapter.unbindQueue).to.have.been.calledWith('test', 'testexchange', '', {
                'x-match': 'any'
            });
        });

        it('should throw error on anonymous queues', async () => {
            await expect(haredo.queue(Queue()).unbindExchange('testexchange', '', { 'x-match': 'any' })).to.reject(
                MissingQueueNameError
            );
        });

        it('should unbind an exchange', async () => {
            await haredo.exchange('testexchange', 'topic').unbindExchange('testexchange2', '', { 'x-match': 'any' });
            expect(adapter.unbindExchange).to.have.been.calledOnce();
            expect(adapter.unbindExchange).to.have.been.calledWith('testexchange', 'testexchange2', '', {
                'x-match': 'any'
            });
        });

        it('should unbind a queue from an exchange object', async () => {
            const exchange = Exchange('testexchange', 'topic');
            await haredo.queue('test').unbindExchange(exchange, '', { 'x-match': 'any' });
            expect(adapter.unbindQueue).to.have.been.calledOnce();
            expect(adapter.unbindQueue).to.have.been.calledWith('test', 'testexchange', '', {
                'x-match': 'any'
            });
        });

        it('should unbind an exchange from an exchange object', async () => {
            const exchange = Exchange('testexchange', 'topic');
            await haredo.exchange('testexchange2', 'topic').unbindExchange(exchange, '', { 'x-match': 'any' });
            expect(adapter.unbindExchange).to.have.been.calledOnce();
            expect(adapter.unbindExchange).to.have.been.calledWith('testexchange2', 'testexchange', '', {
                'x-match': 'any'
            });
        });
    });

    describe('events', () => {
        it('should emit connected event when adapter emits connected event', async () => {
            const eventSpy = spy();
            haredo.emitter.on('connected', eventSpy);
            adapter.emitter.emit('connected', null);
            expect(eventSpy).to.have.been.calledOnce();
        });

        it('should emit disconnected event when adapter emits disconnected event', async () => {
            const eventSpy = spy();
            haredo.emitter.on('disconnected', eventSpy);
            adapter.emitter.emit('disconnected', null);
            expect(eventSpy).to.have.been.calledOnce();
        });

        it('should forward connecting event from adapter', async () => {
            const eventSpy = spy();
            haredo.emitter.on('connecting', eventSpy);
            adapter.emitter.emit('connecting', { attempt: 1 });
            expect(eventSpy).to.have.been.calledOnce();
        });

        it('should forward connectingFailed event from adapter', async () => {
            const eventSpy = spy();
            haredo.emitter.on('connectingFailed', eventSpy);
            adapter.emitter.emit('connectingFailed', { attempt: 1, error: new Error() });
            expect(eventSpy).to.have.been.calledOnce();
        });

        it('should emit message:error when a subscribe callback throws', async () => {
            const error = new Error('test');
            const eventSpy = spy();
            await haredo.queue('test').subscribe(() => {
                throw error;
            });
            haredo.emitter.on('message:error', eventSpy);
            const message = makeTestMessage('test');
            await adapter.subscribe.firstCall.lastArg(message);
            expect(eventSpy).to.have.been.calledOnce();
            expect(eventSpy.firstCall.firstArg).to.eql([error, message]);
        });

        it('should emit message:ack when a message is acked', async () => {
            const eventSpy = spy();
            await haredo.queue('test').subscribe(async (message, info) => {
                await info.ack();
            });
            haredo.emitter.on('message:ack', eventSpy);
            const message = makeTestMessage('test');
            await adapter.subscribe.firstCall.lastArg(message);
            expect(eventSpy).to.have.been.calledOnce();
            expect(eventSpy.firstCall.firstArg).to.eql(message);
        });

        it('should emit message:nack when a message is nacked', async () => {
            const eventSpy = spy();
            await haredo.queue('test').subscribe(async (message, info) => {
                await info.nack();
            });
            haredo.emitter.on('message:nack', eventSpy);
            const message = makeTestMessage('test');
            await adapter.subscribe.firstCall.lastArg(message);
            expect(eventSpy).to.have.been.calledOnce();
            expect(eventSpy.firstCall.firstArg).to.eql([true, message]);
        });

        it('should emit message:nack with requeue false when a message is nacked with requeue false', async () => {
            const eventSpy = spy();
            await haredo.queue('test').subscribe(async (message, info) => {
                await info.nack(false);
            });
            haredo.emitter.on('message:nack', eventSpy);
            const message = makeTestMessage('test');
            await adapter.subscribe.firstCall.lastArg(message);
            expect(eventSpy).to.have.been.calledOnce();
            expect(eventSpy.firstCall.firstArg).to.eql([false, message]);
        });
    });
});
