import { expect } from 'hein';
import { castArray } from './cast-array';

describe('castArray', () => {
    it('should return an array when passing in array', () => {
        expect(castArray([])).to.eql([]);
    });

    it('should return empty array when passing in undefined', () => {
        // eslint-disable-next-line unicorn/no-useless-undefined
        expect(castArray(undefined)).to.eql([]);
    });

    it('should return empty array when passing in null', () => {
        expect(castArray(null)).to.eql([]);
    });

    it('should return an array when passing in a single number', () => {
        expect(castArray(0)).to.eql([0]);
    });
});
