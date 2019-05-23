import { HaredoMessage } from './haredo-message';

export class HaredoError extends Error {
    name: 'HaredoError'
}

export class ChannelBrokenError extends HaredoError {
    constructor(message: string, public haredoMessage: HaredoMessage) {
        super();
    }
}

export class MessageAlreadyHandledError extends HaredoError { }

export class BadArgumentsError extends HaredoError { }
