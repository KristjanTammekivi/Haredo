import 'mocha';

import { expect } from 'chai';
import { merge, walkUntilEnd } from '../../src/utils';

describe('unit/utils', () => {
    describe('merge', () => {
        it('should clone objects', () => {
            const base = {};
            const top = {};
            const merged = merge(base, top);
            expect(merged).to.not.equal(base).and.not.equal(top);
        });
        it('should merge primitive properties', () => {
            expect(merge({ a: 1 }, { b: 2 })).to.eql({ a: 1, b: 2})
        });
        it('should overwrite primitive properties', () => {
            expect(merge({ a: 1 }, { a: 2 })).to.eql({ a: 2 })
        });
    });
    describe('walkUntilEnd', () => {
        it('should return first element of array on first call', () => {
            const arr = [1];
            expect(walkUntilEnd(arr)()).to.equal(1);
        });
        it('should return second element of array on second call', () => {
            const arr = [1, 2];
            const walker = walkUntilEnd(arr);
            walker();
            expect(walker()).to.equal(2);
        });
        it('should return last element after walking through all of them', () => {
            const arr = [1, 2];
            const walker = walkUntilEnd(arr);
            walker();
            walker();
            expect(walker()).to.equal(2);
        });
    });
});
