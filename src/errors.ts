export class HaredoError extends Error {
    name: 'HaredoError';
}

export class ChannelBrokenError extends HaredoError {
    /* istanbul ignore next */
    constructor() {
        super('Cannot ack/nack message, channel is already closed');
    }
}

export class MessageAlreadyHandledError extends HaredoError { }

export class BadArgumentsError extends HaredoError { }

export class HaredoClosingError extends HaredoError {
    /* istanbul ignore next */
    constructor() {
        super('Haredo is closing, cannot create new connection');
    }
}

export class FailedParsingJsonError extends HaredoError {
    constructor(public readonly data: string) {
        super('Failed to parse JSON for message');
    }
}

export class TimeoutError extends Error { }
