import 'mocha';
import { expect } from 'chai';
import { Haredo, HaredoChain, BadArgumentsError } from '../../src';
import { setup, teardown } from '../integration/helpers/amqp';

describe('Unit: HaredoChain', () => {
    let haredo: Haredo;
    let chain: HaredoChain;
    beforeEach(async () => {
        await setup();
        haredo = new Haredo({
            connection: 'amqp://guest:guest@localhost:5672/test'
        });
        chain = haredo.queue('test');
    });
    afterEach(async () => {
        await haredo.close();
        await teardown();
    });
    it('should have json by default', () => {
        expect(chain.state.json).to.be.true;
    });
    it('should have reestablish by default', () => {
        expect(chain.state.reestablish).to.be.true;
    });
    it('should have autoAck by default', () => {
        expect(chain.state.autoAck).to.be.true;
    });
    it('should set confirm', () => {
        expect(chain.confirm().state.confirm).to.be.true;
    });
    it('should disable json', () => {
        expect(chain.json(false).state.json).to.be.false;
    });
    it('should enable json', () => {
        expect(chain.json(false).json(true).state.json).to.be.true;
    });
    it('should disable autoAck', () => {
        expect(chain.autoAck(false).state.autoAck).to.be.false;
    });
    it('should enable autoAck', () => {
        expect(chain.autoAck().state.autoAck).to.be.true;
    });
    it('should disable reestablish', () => {
        expect(chain.reestablish(false).state.reestablish).to.be.false;
    });
    it('should enable reestablish', () => {
        expect(chain.reestablish().state.reestablish).to.be.true;
    });
    it('should set prefetch', () => {
        expect(chain.prefetch(5).state.prefetch).to.eql(5);
    });
    it('should set failSpan', () => {
        expect(chain.failSpan(5000).state.failSpan).to.eql(5000);
    });
    it('should set failThreshold', () => {
        expect(chain.failThreshold(5).state.failThreshold).to.eql(5);
    });
    it('should set failTimeout', () => {
        expect(chain.failTimeout(5000).state.failTimeout).to.eql(5000);
    });
    it('should not allow more than one queue in a chain', () => {
        const fn = () => chain.queue('test2');
        expect(fn).to.throw(BadArgumentsError);
    });
    it('should throw if exchange is provided as string but exchange type incorrect', () => {
        const fn = () => chain.exchange('test', 'f' as any);
        expect(fn).to.throw(BadArgumentsError);
    });
    it('should set default pattern as # when it is not provided', () => {
        expect(chain.exchange('test').state.exchanges[0].patterns).to.eql(['#']);
    });
    it('should not set duplicate exchanges on multiple .exchange calls', () => {
        chain = chain.exchange('test', 'direct', 'pattern').exchange('test', 'direct', 'pattern')
        expect(chain.state.exchanges).to.have.lengthOf(1);
        expect(chain.state.exchanges[0].patterns).to.be.an('array');
        expect(chain.state.exchanges[0].patterns).to.have.lengthOf(1);
    });
    it('should should add a binding to an existing exchangery', () => {
        chain = chain.exchange('test', 'direct', 'pattern1').exchange('test', 'direct', 'pattern2')
        expect(chain.state.exchanges[0].patterns).to.eql(['pattern1', 'pattern2']);
    });
    it('should throw when trying to subscribe without exchange', async () => {
        const chain = haredo.exchange('');
        await expect(chain.subscribe(() => {})).to.be.rejectedWith(BadArgumentsError);
    });
});
