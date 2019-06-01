import 'mocha';
import * as CM from '../../src/connection-manager';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import rewiremock from 'rewiremock';
import * as sinon from 'sinon';
import { delay } from 'bluebird';
import { HaredoClosingError } from '../../src/errors';
import { EventEmitter } from 'events';

use(chaiAsPromised);

describe('Unit: ConnectionManager', () => {
    let ConnectionManager: typeof CM.ConnectionManager;
    let connectionMock: { [key: string]: sinon.SinonSpy | sinon.SinonStub };
    let connectStub: sinon.SinonStub;
    let confirmChannelMock: any;
    beforeEach(async () => {
        confirmChannelMock = new EventEmitter();
        connectionMock = {
            close: sinon.stub(() => { return delay(10); }) as any,
            on: sinon.spy(),
            createConfirmChannel: sinon.stub().returns(confirmChannelMock)
        };
        connectStub = sinon.stub().returns(connectionMock);
        ({ ConnectionManager } = await rewiremock.module(() => import('../../src/connection-manager'), () => {
            return {
                amqplib: {
                    connect: async (...args: any[]) => {
                        return connectStub(args)
                    }
                }
            }
        }))
    });
    afterEach(() => {
        rewiremock.clear();
    });
    it('should return connection', async () => {
        const manager = new ConnectionManager({});
        const connection = await manager.getConnection();
        expect(connection).to.equal(connectionMock);
        expect(connectStub.callCount).to.equal(1);
        manager.close();
    });
    it('should not call connect once on simultaneous getConnection calls', async () => {
        const manager = new ConnectionManager({});
        await Promise.all([
            manager.getConnection(),
            manager.getConnection()
        ]);
        expect(connectStub.callCount).to.eql(1);
        manager.close();
    });
    it('should throw error when trying to get a connection while closing', async () => {
        const manager = new ConnectionManager();
        await manager.getConnection();
        await manager.close();
        await expect(manager.getConnection()).to.eventually.be.rejectedWith(HaredoClosingError);
    });
    it('should return existing confirmChannel when getConfirmChannelForPublishing is called', async () => {
        const manager = new ConnectionManager();
        const channel1 = await manager.getConfirmChannelForPublishing();
        const channel2 = await manager.getConfirmChannelForPublishing();
        expect(channel1).to.equal(channel2);
        expect(connectionMock.createConfirmChannel.callCount).to.equal(1);
    });
});
