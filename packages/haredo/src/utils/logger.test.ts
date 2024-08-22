import { expect } from 'hein';
import { SinonSpy, spy } from 'sinon';
import { createLogger } from './logger';
import { HaredoMessage } from '../types';

describe('logger', () => {
    let logSpy: SinonSpy;

    beforeEach(() => {
        logSpy = spy(() => {});
    });

    it('should return an object', () => {
        expect(createLogger(logSpy)).to.be.an.object();
    });

    it('should log debug to callback', async () => {
        createLogger(logSpy).debug('Test');
        expect(logSpy).to.have.been.calledOnce();
    });

    it('should add log level to callback', async () => {
        createLogger(logSpy).debug('Test');
        expect(logSpy).to.have.been.calledOnce();
        expect(logSpy).to.have.been.calledWith({ level: 'debug', message: 'Test' });
    });

    it('should be possible to provide a component', async () => {
        createLogger(logSpy, { component: 'adapter' }).debug('Test');
        expect(logSpy).to.have.been.calledOnce();
        expect(logSpy).to.have.been.calledWith({ level: 'debug', component: 'adapter', message: 'Test' });
    });

    it('should be possible to set a second level component', async () => {
        createLogger(logSpy, { component: 'adapter' }).component('connect').debug('Test');
        expect(logSpy).to.have.been.calledOnce();
        expect(logSpy).to.have.been.calledWith({ level: 'debug', component: 'adapter:connect', message: 'Test' });
    });

    it('should ignore undefined when creating subComponent', async () => {
        createLogger(logSpy).component('adapter').debug('Test');
        expect(logSpy).to.have.been.calledOnce();
        expect(logSpy).to.have.been.calledWith({ level: 'debug', component: 'adapter', message: 'Test' });
    });

    it('should log at info', async () => {
        createLogger(logSpy).info('Test');
        expect(logSpy).to.have.been.calledOnce();
        expect(logSpy).to.have.been.calledWith({ level: 'info', message: 'Test' });
    });

    it('should log at warning', async () => {
        createLogger(logSpy).warning('Test');
        expect(logSpy).to.have.been.calledOnce();
        expect(logSpy).to.have.been.calledWith({ level: 'warning', message: 'Test' });
    });

    it('should log at error', async () => {
        createLogger(logSpy).error('Test');
        expect(logSpy).to.have.been.calledOnce();
        expect(logSpy).to.have.been.calledWith({ level: 'error', message: 'Test' });
    });

    it('should log with error object', async () => {
        const error = new Error('Test');
        createLogger(logSpy).setError(error).error('Test');
        expect(logSpy).to.have.been.calledOnce();
        expect(logSpy).to.have.been.calledWith({ level: 'error', message: 'Test', error });
    });

    it('should log with message', async () => {
        const fakeMessage = {} as HaredoMessage;
        createLogger(logSpy).setMessage(fakeMessage).error('Test');
        expect(logSpy).to.have.been.calledOnce();
        expect(logSpy).to.have.been.calledWith({ level: 'error', message: 'Test', haredoMessage: fakeMessage });
    });
});
