import { Haredo, haredo } from '../../src/haredo';
import { rabbitUrl, setup, teardown } from './helpers/amqp';

import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import { use } from 'chai';
import { eventToPromise } from './helpers/utils';

use(sinonChai);
use(chaiAsPromised);

describe('integration/consuming', () => {
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
    it('should close consumer when rabbit is closed', async () => {
        const consumer = await rabbit.queue('test').subscribe(() => { });
        const closePromise = eventToPromise(consumer.emitter, 'close')
        await rabbit.close();
        await closePromise;
    });
});
