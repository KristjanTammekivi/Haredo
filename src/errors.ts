export abstract class HaredoError extends Error {
    name: 'HaredoError'
}

export class BadArgumentsError extends HaredoError { }
export class HaredoClosedError extends HaredoError {
    constructor() {
        super('Haredo is closing/closed, not allowing new channels');
    }
}
