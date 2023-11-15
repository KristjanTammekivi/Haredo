export class HaredoTestAdapterError extends Error {
    constructor(message: string) {
        super(`HAREDO TEST ADAPTER: ${ message }`);
    }
}
