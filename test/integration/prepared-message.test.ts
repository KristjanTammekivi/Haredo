import 'mocha';
import { Haredo, PreparedMessage, Queue, HaredoChain, Exchange, ExchangeType } from '../../src/index'
import {
    setup,
    teardown,
    getSingleMessage
} from './helpers/amqp';
import { use, expect } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

const TypedPreparedMessage = new PreparedMessage<{ test: number }>()

describe('Prepared message', () => {
    let haredo: Haredo;
    let queue: Queue<{ test: number }>;
    let exchange: Exchange;
    let queueChain: HaredoChain<{ test: number }>;
    let exchangeChain: HaredoChain<{ test: number }>;
    beforeEach(async () => {
        await setup();
        haredo = new Haredo({
            connectionOptions: 'amqp://guest:guest@localhost:5672/test',
            autoAck: false
        });
        await haredo.connect();
        queue = new Queue('test').durable();
        queueChain = haredo.queue(queue);
        exchange = new Exchange('test', ExchangeType.Topic);
        exchangeChain = await queueChain
            .exchange(exchange, '*')
            .setup();
    });
    afterEach(async () => {
        await haredo.close();
        await teardown();
    });
    it('.content() should set content for message', async () => {
        const message = TypedPreparedMessage.content({ test: 5 });
        await queueChain.publish(message);
        const publishedMessage = await getSingleMessage(queue.name);
        expect(JSON.parse(publishedMessage.content)).to.eql({ test: 5 });
    });
    it('.routingKey() should set routing key for message', async () => {
        const message = TypedPreparedMessage
            .content({ test: 5 })
            .routingKey('test');
        await exchangeChain.publish(message);
        const m = await getSingleMessage(queue.name);
        expect(m.fields.routingKey).to.eql('test');
    });
});
