import 'mocha';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { HaredoError, BadArgumentsError } from '../../src/index';
import { flatObjectIsEqual, swallowRejection } from '../../src/utils';
use(chaiAsPromised);

describe('utils', () => {
    describe('flatObjectIsEqual', () => {
        it('should return true for two empty literals', () => {
            expect(flatObjectIsEqual({}, {})).to.be.true;
        });
        it('should return false for different values for same properties', () => {
            expect(flatObjectIsEqual({ a: false }, { a: true })).to.be.false;
        });
        it('should return false for extra properties', () => {
            expect(flatObjectIsEqual({ a: false }, {})).to.be.false;
            expect(flatObjectIsEqual({}, { a: false })).to.be.false;
        });
    });
    describe('swallowError', () => {
        it('should swallow specified error', async () => {
            await expect(swallowRejection(HaredoError, Promise.reject(new HaredoError()))).to.eventually.not.be.rejected;
        });
        it('should reject non-specified errors', async () => {
            await expect(swallowRejection(BadArgumentsError, Promise.reject(new HaredoError('test')))).to.be.rejectedWith('test');
        });
    });
});
