import 'mocha';
import { Haredo, Queue, Exchange } from '../../src/index'
import { setup, teardown, checkQueue, checkExchange, getSingleMessage } from './helpers/amqp';
import { use, expect } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { ExchangeType } from '../../src/exchange';
import { delay } from 'bluebird';
import { HaredoClosedError } from '../../src/errors';

use(chaiAsPromised);

describe.only('Graceful Shutdown', () => {
    let haredo: Haredo;
    beforeEach(async () => {
        await setup();
        haredo = new Haredo({
            connectionOptions: 'amqp://guest:guest@localhost:5672/test',
            autoAck: false
        });
        await haredo.connect();
    });
    afterEach(async () => {
        await haredo.close();
        await teardown();
    });

    it.only('should not allow any more channels to be opened after close is called', async () => {
        const shutdownPromise = haredo.close();
        expect(haredo.getChannel()).to.eventually.be.rejectedWith(HaredoClosedError);
        await expect(shutdownPromise).to.eventually.eql(undefined);
    });

    it.only('should shut down consumers', async () => {
        const queue = new Queue('testQueue')
        const consumer = await haredo.queue(queue).subscribe(async message => {
            await delay(200);
            await message.ack();
        });
        await haredo.queue(queue).publish({ test: 1 });
        const shutdownPromise = await haredo.close();
        expect(consumer.closing).to.be.true;
    });

});
