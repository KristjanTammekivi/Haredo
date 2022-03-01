export class HaredoError extends Error {
    name = 'HaredoError';
}

export class InvalidOptionsError extends HaredoError {
    name = 'InvalidOptionsError';
    constructor(public key: string) {
        super(`Error, connection object contains unknown key: ${ key }`);
    }
}

export class ChannelBrokenError extends HaredoError {
    /* istanbul ignore next */
    constructor(operation: 'ack' | 'nack') {
        super(`Cannot ${ operation } message, channel is already closed`);
    }
}

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
