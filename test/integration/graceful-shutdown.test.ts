import 'mocha';
import { Haredo, Queue } from '../../src/index'
import { setup, teardown } from './helpers/amqp';
import { use, expect } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { HaredoClosedError } from '../../src/errors';
import { delayPromise } from '../../src/utils';

use(chaiAsPromised);

describe('Graceful Shutdown', () => {
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

    it('should not allow any more channels to be opened after close is called', async () => {
        const shutdownPromise = haredo.close();
        expect(haredo.getChannel()).to.eventually.be.rejectedWith(HaredoClosedError);
        await expect(shutdownPromise).to.eventually.eql(undefined);
    });

    it('should shut down consumers', async () => {
        const queue = new Queue('testQueue')
        const consumer = await haredo.queue(queue).subscribe(async message => {
            await delayPromise(200);
            await message.ack();
        });
        await haredo.queue(queue).publish({ test: 1 });
        const shutdownPromise = await haredo.close();
        expect(consumer.closing).to.be.true;
    });

});
