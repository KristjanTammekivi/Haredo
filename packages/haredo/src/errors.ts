export class HaredoError extends Error {}

export class MissingQueueNameError extends HaredoError {
    constructor() {
        super('Missing queue name');
    }
}
export class FailedParsingJsonError extends HaredoError {
    constructor(public readonly data: string | null) {
        super('Failed to parse JSON for message');
    }
}

export class NotConnectedError extends HaredoError {
    constructor() {
        super('Not connected to RabbitMQ');
    }
}
