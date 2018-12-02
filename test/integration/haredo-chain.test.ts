import 'mocha';
import { Queue, Haredo } from '../../src/index'
import {
    setup,
    teardown,
    getSingleMessage
} from './helpers/amqp';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { delay } from 'bluebird';

use(chaiAsPromised);

describe('Queue', () => {
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
    it('should set reestablish', () => {
        const queue = new Queue();
        expect(haredo.queue(queue).reestablish().state.reestablish).to.be.true;
    });
    it('should set failSpan', () => {
        const queue = new Queue();
        expect(haredo.queue(queue).failSpan(5).state.failSpan).to.equal(5);
    });
    it('should set failThreshold', () => {
        const queue = new Queue();
        expect(haredo.queue(queue).failThreshold(5).state.failThreshold).to.equal(5);
    });
    it('should set failTimeout', () => {
        const queue = new Queue();
        expect(haredo.queue(queue).failTimeout(5).state.failTimeout).to.equal(5);
    });
});
