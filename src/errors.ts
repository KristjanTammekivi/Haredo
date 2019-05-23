import { HaredoMessage } from './haredo-message';

export class HaredoError extends Error {
    name: 'HaredoError'
}

export class ChannelBrokenError extends HaredoError {
    constructor(public haredoMessage: HaredoMessage) {
        super('Cannot ack/nack message, channel is already closed');
    }
}

export class MessageAlreadyHandledError extends HaredoError { }

export class BadArgumentsError extends HaredoError { }
