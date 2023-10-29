import { Queue } from './queue';
import { SinonStubbedInstance, stub } from 'sinon';
import { Adapter, Consumer } from './adapter';
import { Haredo } from './haredo';
import { expect } from 'hein';

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
});
