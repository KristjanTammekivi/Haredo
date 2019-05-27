import 'mocha';
import { expect, use } from 'chai';

import * as chaiAsPromised from 'chai-as-promised';
import { PreparedMessage } from '../../src'
use(chaiAsPromised);

describe('PreparedMessage', () => {
    describe('methods', () => {
        it('should set content type header and content with .json', () => {
            let message = new PreparedMessage().json('test');
            expect(message.options.headers).to.have.property('Content-Type', 'application/json');
            message = new PreparedMessage().json();
            expect(message.options.headers).to.have.property('Content-Type', 'application/json');
        });
        it('should set delay header with .delay', () => {
            const message = new PreparedMessage().delay(5000);
            expect(message.options.headers).to.have.property('x-delay', 5000);
        });
        it('should not throw on simple methods', () => {
            new PreparedMessage()
                .appId('test')
                .correlationId('test')
                .persistent(true)
                .mandatory(true)
                .expiration(500)
                .messageId('test')
                .userId('test')
                .carbonCopy(['rk1', 'rk2'])
                .blindCarbonCopy(['rk3', 'rk4'])
                .priority(5)
                .type('simple-message')
                .setRoutingKey('test')
                .contentEncoding('gzip')
                .contentType('application/json')
                .replyTo('haredo')
                .timestamp(new Date().getTime())
                .toString();
        });
    });
});
