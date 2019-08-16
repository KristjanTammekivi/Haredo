import 'mocha';

import { expect } from 'chai';
import { merge } from '../../src/utils';

describe('utils', () => {
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
});
