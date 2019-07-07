import 'source-map-support/register';
import 'mocha';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { Haredo, Queue } from '../../src/index';
import { setup, teardown, verifyQueue, getSingleMessage, publishMessage } from './helpers/amqp';
import { delay } from '../../src/utils';
use(chaiAsPromised);

describe.only('RPC', () => {
    let haredo: Haredo
    beforeEach(async () => {
        await setup();
        haredo = new Haredo({
            connection: 'amqp://guest:guest@localhost:5672/test'
        });
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
});
