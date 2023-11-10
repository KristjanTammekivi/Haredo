import { expect } from 'hein';
import { parseJSON } from './parse-json';
import { FailedParsingJsonError } from '../errors';

describe('parseJson', () => {
    it('should return null when passed in null', () => {
        expect(parseJSON(null)).to.eq(null);
    });
    it('should return a parsed object', () => {
        expect(parseJSON('{ "a": 1 }')).to.eql({ a: 1 });
    });
    it('should return a FailedParsingJsonError if parsing fails', () => {
        expect(() => parseJSON('hello, world')).to.throw(FailedParsingJsonError);
    });
});
