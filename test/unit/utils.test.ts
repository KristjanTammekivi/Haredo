import { omit } from '../../src/utils';
import { expect } from 'chai';

describe('utils', () => {
    describe('omit', () => {
        it('should not remove any properties when called with 0 extra arguments', () => {
            expect(omit({ test: true })).to.eql({
                test: true
            });
        });
        it('should omit selected fields', () => {
            expect(omit({ test: true, really: true }, 'really')).to.eql({
                test: true
            });
        });
    });
});
