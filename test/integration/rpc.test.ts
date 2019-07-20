import 'source-map-support/register';
import 'mocha';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { Haredo, Queue, PreparedMessage } from '../../src/index';
import { setup, teardown, getSingleMessage, publishMessage } from './helpers/amqp';
import { delay, timeout, TimeoutError } from '../../src/utils';
import { RpcService } from '../../src/rpc-service';
import { ConnectionManager } from '../../src/connection-manager';
use(chaiAsPromised);

describe('RPC', () => {
    let haredo: Haredo
    const opts = {
        connection: 'amqp://guest:guest@localhost:5672/test'
    }
    beforeEach(async () => {
        await setup();
        haredo = new Haredo(opts);
        await haredo.connect();
    });
    afterEach(async () => {
        await haredo.close();
        await teardown();
    });
    it('should publish to selected exchange', async () => {
        await haredo.queue('testqueue').exchange('testexchange', 'topic', '#', { durable: true }).setup();
        haredo.exchange('testexchange', 'topic').rpc('test', 'test');
        await delay(40);
        await expect(getSingleMessage('testqueue')).to.not.be.rejected;
    });
    it('should resolve with a replied message', async () => {
        await haredo.queue('testqueue').setup();
        const promise = haredo.queue('testqueue').rpc([5, 4]);
        await delay(40);
        const message = await getSingleMessage('testqueue');
        expect(message.properties.correlationId).to.be.a('string');
        await publishMessage(message.properties.replyTo, 20, { correlationId: message.properties.correlationId });
        await expect(promise).to.eventually.equal(20);
    });
    it('should reply', async () => {
        const queue = new Queue<[number, number]>('testqueue');
        await haredo.queue(queue).subscribe((data, msg) => {
            msg.reply(data[0] * data[1]);
        });
        const result = await haredo.queue(queue).rpc([3, 4]);
        expect(result).to.equal(12);
    });
    it('should reply when a value is returned from the callback', async () => {
        const queue = new Queue<[number, number]>('testqueue');
        await haredo.queue(queue).autoReply().subscribe(data => {
            return data[0] * data[1];
        });
        const result = await haredo.queue<string>(queue).json(false).rpc(JSON.stringify([2, 3]));
        expect(result).to.equal(6);
    });
    it('should not autoreply when it has not been enabled', async () => {
        const queue = new Queue<[number, number]>('testqueue');
        const message = new PreparedMessage().json([6, 8]);
        haredo.queue(queue).autoReply(false).subscribe(data => {
            return data[0] * data[1];
        });
        await expect(
            Promise.race([timeout(200), haredo.queue(queue).rpc(message)])
        ).to.be.rejectedWith(TimeoutError);
    });
    it('should not initialize twice', async () => {
        const cm = new ConnectionManager(opts.connection);
        await cm.getConnection();
        const rpc = new RpcService(cm);
        const promise1 = rpc.start();
        const promise2 = rpc.start();
        const x = await Promise.race([ promise1, promise2]);
        await Promise.all([promise1, promise2]);
        expect(x).to.equal(rpc.consumer);
        await cm.close();
    });
    it('should resolve if reply is not expected', async () => {
        let didNotThrow;
        await haredo.queue('test').subscribe(async (data, message) => {
            await message.reply('This should not fail');
            didNotThrow = true;
        });
        await haredo.queue('test').publish('message');
        await delay(50);
        expect(didNotThrow).to.be.true;
    });
    it('should not throw when replying twice', async () => {
        const queue = new Queue<[number, number]>('testqueue');
        const message = new PreparedMessage().json([6, 8]);
        haredo.queue(queue).autoReply(false).subscribe((data, message) => {
            message.reply(data[0] * data[1]);
            message.reply(data.reduce((acc, item) => acc * item, 0));
        });
        await haredo.queue(queue).rpc(message);
    });
});
