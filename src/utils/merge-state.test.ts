import { expect } from 'hein';
import { mergeState } from './merge-state';

describe('mergeState', () => {
    it('should merge arrays', () => {
        const f1 = async () => {};
        const f2 = async () => {};
        expect(
            mergeState({ adapter: {} as any, queue: {} as any, middleware: [f1] }, { middleware: [f2] }).middleware
        ).to.eql([f1, f2]);
    });
    it('should work with new array', async () => {
        const f1 = async () => {};
        const f2 = async () => {};
        expect(mergeState({ adapter: {} as any, queue: {} as any } as any, { middleware: [f1, f2] }).middleware).to.eql(
            [f1, f2]
        );
    });
});
