import 'mocha';

import { initialChain } from '../../src/haredo';
import { expect } from 'chai';

describe('chain', () => {
    it('Should have base methods', () => {
        const chain = initialChain({});
        const props = ['exchange', 'queue'] as (keyof typeof chain)[];
        props.forEach(prop => {
            expect(chain).to.have.property(prop);
        });
    });
});
