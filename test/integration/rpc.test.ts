import { Haredo, haredo } from '../../src/haredo';
import { setup, teardown, getSingleMessage, publishMessage } from './helpers/amqp';
import { expect } from 'chai';
import { delay } from '../../src/utils';

describe('integration/rpc', () => {
    let rabbit: Haredo;
    beforeEach(async () => {
        await setup();
        rabbit = haredo({
            connection: 'amqp://guest:guest@localhost:5672/test'
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
});
