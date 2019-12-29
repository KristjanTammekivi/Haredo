import rewiremock from 'rewiremock';
import { stub, SinonStub } from 'sinon';
import { EventEmitter } from 'events';
import { expect, use } from 'chai';
import { delay } from '../../src/utils';

import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

use(sinonChai);
use(chaiAsPromised);

describe('unit/connection-manager', () => {
    let connectionManager: typeof import("../../src/connection-manager");
    let connectionMock: EventEmitter &  { close(): void };
    let connectStub: SinonStub;
    const noop = () => {};
    const loggers = {
        debug: noop,
        info: noop,
        warning: noop,
        error: noop
    };

    beforeEach(async () => {
        connectionMock = Object.assign(new EventEmitter(), { async close() {} });
        connectStub = stub().resolves(connectionMock);
        connectionManager = await rewiremock.module(() => import('../../src/connection-manager'), () => ({
            amqplib: {
                connect: connectStub
            }
        }));
    });

    it('should return connection', async () => {
        const cm = connectionManager.makeConnectionManager({}, {}, loggers);
        const connection = await cm.getConnection();
        expect(connection).to.equal(connectionMock);
    });

    it('should reopen connection if it closes', async () => {
        const cm = connectionManager.makeConnectionManager({}, {}, loggers);
        const connection = await cm.getConnection();
        connection.emit('close');
        await delay(10);
        expect(connectStub).to.be.calledTwice;
    })

});
