import { EventEmitter } from 'events';

export type Omit<T extends {}, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

interface TypedEE<T> {
    addListener<K extends keyof T>(event: K, listener: (arg?: T[K]) => any): this;
    on<K extends keyof T>(event: K, listener: (arg?: T[K]) => any): this;
    once<K extends keyof T>(event: K, listener: (arg?: T[K]) => any): this;
    removeListener<K extends keyof T>(event: K, listener: (arg?: T[K]) => any): this;
    removeAllListeners<K extends keyof T>(event?: K): this;
    listeners<K extends keyof T>(event: K): ((arg?: T[K]) => any)[];
    emit<K extends keyof T>(event: K, arg?: T[K]): boolean;
    listenerCount<K extends keyof T>(type: K): number;
    prependListener<K extends keyof T>(event: K, listener: (arg?: T[K]) => any): this;
    prependOnceListener<K extends keyof T>(event: K, listener: (arg?: T[K]) => any): this;
}

export type TypedEventEmitter<T> = TypedEE<T> & Omit<
    EventEmitter,
    keyof TypedEE<any>>;

export const typedEventToPromise = <T>(
    emitter: TypedEventEmitter<T>,
    event: keyof T
): Promise<any> => {
    return new Promise((resolve) => {
        emitter.once(event, (...args: any[]) => {
            resolve(args);
        });
    });
};

export const makeEmitter = <T>() => {
    return new EventEmitter() as TypedEventEmitter<T>;
}
