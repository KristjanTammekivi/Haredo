export const keyValuePairs = (obj: Object): string[] => {
    return Object.keys(obj).map(key => {
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
}

type notany = object | string | number | undefined | null;
export type MergeTypes<T, U> = T extends notany ? U extends notany ? T | U : T : U;
