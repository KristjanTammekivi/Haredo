import { Queue } from './queue';
import { SinonStubbedInstance, stub } from 'sinon';
import { Adapter, Consumer } from './adapter';
import { Haredo } from './haredo';
import { expect } from 'hein';
import { Exchange } from './exchange';

const rabbitURL = process.env.RABBIT_URL || 'amqp://localhost:5672';

describe('queue', () => {
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
    it('should be possible to define quorum queues', async () => {
        const queue = Queue('test').quorum();
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', {}, { 'x-queue-type': 'quorum' });
    });
    it('should be possible to define stream queues', async () => {
        const queue = Queue('test').stream();
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', {}, { 'x-queue-type': 'stream' });
    });
    it('should set autoDelete', async () => {
        const queue = Queue('test').autoDelete();
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', { autoDelete: true });
    });
    it('should set autoDelete to false', async () => {
        const queue = Queue('test').autoDelete(false);
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', { autoDelete: false });
    });
    it('should set dead letter exchange', async () => {
        const queue = Queue('test').dead('dlx');
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', {}, { 'x-dead-letter-exchange': 'dlx' });
    });
    it('should set dead letter exchange from an object', async () => {
        const queue = Queue('test').dead(Exchange('dlx', 'topic'));
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', {}, { 'x-dead-letter-exchange': 'dlx' });
    });
    it('should set dead letter exchange routing key', async () => {
        const queue = Queue('test').dead('dlx', 'rk');
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith(
            'test',
            {},
            {
                'x-dead-letter-exchange': 'dlx',
                'x-dead-letter-routing-key': 'rk'
            }
        );
    });
    it('should set exclusive', async () => {
        const queue = Queue('test').exclusive();
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', { exclusive: true });
    });
    it('should set exclusive to false', async () => {
        const queue = Queue('test').exclusive(false);
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', { exclusive: false });
    });
    it('should set durable', async () => {
        const queue = Queue('test').durable();
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', { durable: true });
    });
    it('should set durable to false', async () => {
        const queue = Queue('test').durable(false);
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', { durable: false });
    });
    it('should set passive', async () => {
        const queue = Queue('test').passive();
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', { passive: true });
    });
    it('should set passive to false', async () => {
        const queue = Queue('test').passive(false);
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', { passive: false });
    });
    it('should set messageTtl', async () => {
        const queue = Queue('test').messageTtl(1000);
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', {}, { 'message-ttl': 1000 });
    });
    it('should set maxLength', async () => {
        const queue = Queue('test').maxLength(1000);
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', {}, { 'x-max-length': 1000 });
    });
    it('should set maxLengthBytes', async () => {
        const queue = Queue('test').maxLengthBytes(1000);
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', {}, { 'x-max-length-bytes': 1000 });
    });
    it('should set overflow for max-length', async () => {
        const queue = Queue('test').maxLength(1000, 'reject-publish');
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith(
            'test',
            {},
            { 'x-max-length': 1000, 'x-overflow': 'reject-publish' }
        );
    });
    it('should set overflow for max-length-bytes', async () => {
        const queue = Queue('test').maxLengthBytes(1000, 'drop-head');
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith(
            'test',
            {},
            { 'x-max-length-bytes': 1000, 'x-overflow': 'drop-head' }
        );
    });
    it('should set expire', async () => {
        const queue = Queue('test').expires(1000);
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', {}, { 'x-expires': 1000 });
    });
    it('should set maxPriority', async () => {
        const queue = Queue('test').maxPriority(1000);
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', {}, { 'x-max-priority': 1000 });
    });
    it('should set deliveryLimit', async () => {
        const queue = Queue('test').deliveryLimit(1000);
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', {}, { 'x-delivery-limit': 1000 });
    });
    it('should set singleActiveConsumer', async () => {
        const queue = Queue('test').singleActiveConsumer();
        await haredo.queue(queue).setup();
        expect(adapter.createQueue).to.have.been.calledWith('test', {}, { 'x-single-active-consumer': true });
    });
});
