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

export const head = <T>(arr: T[]): T => arr[0];
export const tail = <T>(arr: T[]): T[] => arr.slice(1);

export const reject = <T>(arr: T[], cb: (item: T, index: number, arr: T[]) => boolean): T[] => {
    return arr.filter((...args) => !cb(...args));
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

export const swallowRejection = async <T>(error: { new(): Error }, promise: Promise<T>): Promise<T | undefined> => {
    try {
        return await promise;
    } catch (e) {
        if (!(e instanceof error)) {
            throw e;
        }
    }
};

export const swallowError = <T>(error: { new(): Error }, fn: () => T): T | undefined => {
    try {
        return fn();
    } catch (e) {
        if (!(e instanceof error)) {
            throw e;
        }
    }
};

type notany = object | string | number | undefined | null;
export type MergeTypes<T, U> = T extends notany ? U extends notany ? T | U : T : U;

export const defaultToTrue = (value: boolean) => defaultTo(value, true);
export const defaultTo = <T>(value: T, backup: T) => value === undefined ? backup : value;

export const pick = <T, K extends keyof T>(item: T, ...keys: K[]) => {
    const pickedItem = {} as Pick<T, K>;
    for (const key of keys) {
        pickedItem[key] = item[key];
    }
    return pickedItem;
};

export const omit = <T, K extends keyof T>(item: T, ...keys: K[]) => {
    const omittedItem = {} as Omit<T, K>;
    for (const [key, value] of Object.entries(item)) {
        if (!keys.includes(key as K)) {
            omittedItem[key as Exclude<keyof T, K>] = value;
        }
    }
    return omittedItem;
};
