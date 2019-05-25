import 'mocha';
import { expect } from 'chai';

import { ConsumerManager } from '../../src/consumer-manager';
import { HaredoError } from '../../src/errors';

describe('ConsumerManager', () => {
    it('should not allow consumers to be added when server is shutting down', () => {
        const manager = new ConsumerManager();
        manager.close();
        expect(() => manager.add({} as any)).to.throw(HaredoError);
    });
});
