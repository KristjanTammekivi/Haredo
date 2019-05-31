export const keyValuePairs = (obj: Object): string[] => {
    return Object.keys(obj).map((key) => {
        return `${key}=${stringify((obj as any)[key])}`;
    });
};

export const stringify = (item: any): string => {
    if (typeof item === 'string' || typeof item === 'number') {
        return item.toString();
    }

    if (item === undefined || item === null) {
        return '';
    }

    return JSON.stringify(item);
};

export const get = <T extends object, U>(obj: T, cb: (obj: T) => U): U | undefined => {
    try {
        return cb(obj);
    } catch (e) {
        return;
    }
};

export const flatObjectIsEqual = (base: any, top: any) => {
    if (Object.keys(base).some(x => base[x] !== top[x])) {
        return false;
    }
    if (Object.keys(top).some(x => base[x] !== top[x])) {
        return false;
    }
    return true;
};

export const promiseMap = async <T, U>(arr: T[], cb: (obj: T, i: number, arr: T[]) => U) => {
    return Promise.all<U>(arr.map(cb));
};

export const delay = (ms: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

export class TimeoutError extends Error { }

export const timeout = (milliseconds: number) => {
    return new Promise((resolve, reject) => {
        setTimeout(reject, milliseconds, new TimeoutError());
    });
};

export const swallowError = async <T>(error: { new(): Error }, promise: Promise<T>): Promise<T | undefined> => {
    try {
        return await promise;
    } catch (e) {
        if (!(e instanceof error)) {
            throw e;
        }
    }
};

type notany = object | string | number | undefined | null;
export type MergeTypes<T, U> = T extends notany ? U extends notany ? T | U : T : U;

export const defaultToTrue = (bool: boolean) => bool === undefined ? true : bool;
