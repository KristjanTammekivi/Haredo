import { FailedParsingJsonError } from './errors';

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

type notany = object | string | number | undefined | null;
export type MergeTypes<T, U> = T extends notany ? U extends notany ? T | U : T : U;

export const omit = <T, K extends keyof T>(item: T, ...keys: K[]) => {
    const omittedItem = {} as Omit<T, K>;
    for (const [key, value] of Object.entries(item)) {
        if (!keys.includes(key as K)) {
            omittedItem[key as Exclude<keyof T, K>] = value;
        }
    }
    return omittedItem;
};

export const merge = <T>(base: T, top: T): T => {
    return Object.assign({}, base, top);
};

export const parseJSON = (data: string) => {
    try {
        return JSON.parse(data);
    } catch {
        throw new FailedParsingJsonError(data);
    }
};
