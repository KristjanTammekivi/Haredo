import { TypedEventEmitter } from './typed-event-target';

export const typedEventToPromise = async <U extends Record<string, any>, K extends keyof U & string>(
    emitter: TypedEventEmitter<U>,
    event: K
): Promise<U[K]> => {
    const { promise, resolve } = withResolvers<U[K]>();
    emitter.once(event, (data) => {
        resolve(data);
    });
    return promise as U[K];
};

const withResolvers = <T>() => {
    let resolve: undefined | ((value: T) => void);
    let reject: undefined | ((reason?: any) => void);
    const promise = new Promise((r, rej) => {
        resolve = r;
        reject = rej;
    });
    return { promise, resolve: resolve!, reject: reject! };
};
