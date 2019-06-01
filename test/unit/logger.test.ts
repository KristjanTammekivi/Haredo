import 'mocha';
import { expect } from 'chai';
import { setLoggers } from '../../src';
import { makeLogger } from '../../src/logger';

describe('Unit: logger', () => {
    it('should set error logger', () => {
        let loggedMessage: string;
        const logger = makeLogger('test');
        setLoggers({
            error: (msg) => {
                loggedMessage = msg;
            }
        });
        logger.error(1, {});
        expect(loggedMessage).to.equal('test - 1 {}');
    });
    it('should set debug logger', () => {
        let loggedMessage: string;
        const logger = makeLogger('test');
        setLoggers({
            debug: (msg) => {
                loggedMessage = msg;
            }
        });
        logger.debug(1, {});
        expect(loggedMessage).to.equal('test - 1 {}');
    });
    it('should set info logger', () => {
        let loggedMessage: string;
        const logger = makeLogger('test');
        setLoggers({
            info: (msg) => {
                loggedMessage = msg;
            }
        });
        logger.info(1, {});
        expect(loggedMessage).to.equal('test - 1 {}');
    });
});
