import 'mocha';

import { initialChain, queueChain } from '../../src/haredo';
import { expect } from 'chai';
import { Middleware } from '../../src/state';

describe.only('chain', () => {
    it('Should have base methods', () => {
        const chain = initialChain({});
        const props = ['exchange', 'queue'] as (keyof typeof chain)[];
        props.forEach(prop => {
            expect(chain).to.have.property(prop);
        });
    });
    it('should concatenate middleware arrays on multiple .use calls', () => {
        const middleware: Middleware<unknown, unknown>[] = [
            function test1() {},
            function test2() {},
        ];
        const chain = queueChain({}).use(middleware[0]).use(middleware[1]);
        expect(chain.getState().middleware).to.eql(middleware);
    })
});
