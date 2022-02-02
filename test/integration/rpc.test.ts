import 'source-map-support/register';
import { Haredo, haredo } from '../../src/haredo';
import { setup, teardown, getSingleMessage, publishMessage, rabbitUrl } from './helpers/amqp';
import { expect } from 'chai';
import { delay } from '../../src/utils';
import { preparedMessage } from '../../src/prepared-message';

describe('integration/rpc', () => {
    let rabbit: Haredo;
    beforeEach(async () => {
        await setup();
        rabbit = haredo({
            connection: rabbitUrl
        });
    });
    afterEach(async () => {
        rabbit.close();
        await teardown();
    });
    it('should publish message', async () => {
        await Promise.race([rabbit.queue('test').rpc('test'), delay(150)]);
        const msg = await getSingleMessage('test');
        expect(msg.content).to.equal('"test"');
        await rabbit
            .queue(msg.properties.replyTo)
            .skipSetup()
            .publish(preparedMessage().correlationId(msg.properties.correlationId).json('world'));
    });
    it('should respond reply in a subscriber if message has correlationId and replyTo set', async () => {
        await rabbit.queue('responsequeue').setup();
        await rabbit.queue('test').json(false).subscribe(({ reply }) => {
            reply('world');
        });
        await publishMessage('test', 'hello', { correlationId: 'test', replyTo: 'responsequeue' });
        await delay(100);
        const reply = await getSingleMessage('responsequeue');
        expect(reply.content).to.equal('world');
        expect(reply.properties.correlationId).to.equal('test');
    });
    it('should resolve with message from reply', async () => {
        await rabbit.queue('test').autoReply().subscribe(() => {
            return 'world';
        });
        const reply = await rabbit.queue('test').confirm().rpc('hello');
        expect(reply).to.equal('world');
    });
    it('should rpc to exchange', async () => {
        await rabbit.queue('test')
            .autoReply()
            .bindExchange('testexchange', '*', 'topic')
            .subscribe(() => 'world');
        const result = await rabbit
            .exchange('testexchange', 'topic')
            .rpc('hello', 'rk');
        expect(result).to.equal('world');
    });
    it('should wait for reply before closing', async () => {
        await rabbit.queue('test')
            .autoReply()
            .subscribe(async () => {
                await delay(300);
                return 'world';
            });
        const promise = rabbit.queue('test').skipSetup().rpc('hello');
        await delay(20);
        await rabbit.close();
        expect(await promise).to.equal('world');
    });
    it('should silently not reply when messageInstance.reply is called but correlationId is not present', async () => {
        let replyDidNotThrow = false;
        await rabbit.queue('test')
            .subscribe(async ({ reply }) => {
                await reply('Should be fine');
                replyDidNotThrow = true;
            });
        await rabbit.queue('test').publish('hello', { replyTo: 'somewhere else' });
        await delay(500);
        expect(replyDidNotThrow).to.be.true;
    });
});
