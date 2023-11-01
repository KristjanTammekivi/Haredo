import { SinonStubbedInstance, stub } from 'sinon';
import { Adapter, Consumer } from './adapter';
import { Haredo } from './haredo';
import { expect } from 'hein';
import { Exchange } from './exchange';

const rabbitURL = process.env.RABBIT_URL || 'amqp://localhost:5672';

describe('exchange', () => {
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
    it('should set durable', async () => {
        const exchange = Exchange('test', 'topic').durable();
        await haredo.exchange(exchange).setup();
        expect(adapter.createExchange).to.have.been.calledWith('test', 'topic', { durable: true });
    });
    it('should set durable false', async () => {
        const exchange = Exchange('test', 'topic').durable(false);
        await haredo.exchange(exchange).setup();
        expect(adapter.createExchange).to.have.been.calledWith('test', 'topic', { durable: false });
    });
    it('should set autoDelete', async () => {
        const exchange = Exchange('test', 'topic').autoDelete();
        await haredo.exchange(exchange).setup();
        expect(adapter.createExchange).to.have.been.calledWith('test', 'topic', { autoDelete: true });
    });
    it('should set autoDelete false', async () => {
        const exchange = Exchange('test', 'topic').autoDelete(false);
        await haredo.exchange(exchange).setup();
        expect(adapter.createExchange).to.have.been.calledWith('test', 'topic', { autoDelete: false });
    });
    it('should set passive', async () => {
        const exchange = Exchange('test', 'topic').passive();
        await haredo.exchange(exchange).setup();
        expect(adapter.createExchange).to.have.been.calledWith('test', 'topic', { passive: true });
    });
    it('should set passive false', async () => {
        const exchange = Exchange('test', 'topic').passive(false);
        await haredo.exchange(exchange).setup();
        expect(adapter.createExchange).to.have.been.calledWith('test', 'topic', { passive: false });
    });
    it('should set alternate exchange', async () => {
        const exchange = Exchange('test', 'topic').alternateExchange('alternate');
        await haredo.exchange(exchange).setup();
        expect(adapter.createExchange).to.have.been.calledWith(
            'test',
            'topic',
            {},
            { 'alternate-exchange': 'alternate' }
        );
    });
    it('should set alternate exchange from an object', async () => {
        const exchange = Exchange('test', 'topic').alternateExchange(Exchange('alternate', 'topic'));
        await haredo.exchange(exchange).setup();
        expect(adapter.createExchange).to.have.been.calledWith(
            'test',
            'topic',
            {},
            { 'alternate-exchange': 'alternate' }
        );
    });
    it('should set exchange as delayed', async () => {
        const exchange = Exchange('test', 'topic').delayed();
        await haredo.exchange(exchange).setup();
        expect(adapter.createExchange).to.have.been.calledWith(
            'test',
            'x-delayed-message',
            {},
            { 'x-delayed-type': 'topic' }
        );
    });
    it('should not reset arguments after adding autoDelete', async () => {
        const exchange = Exchange('test', 'topic').delayed().autoDelete();
        await haredo.exchange(exchange).setup();
        expect(adapter.createExchange).to.have.been.calledWith(
            'test',
            'x-delayed-message',
            { autoDelete: true },
            { 'x-delayed-type': 'topic' }
        );
    });
});
