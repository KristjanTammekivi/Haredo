export const keyValuePairs = (obj: Object): string[] => {
    return Object.keys(obj).map(key => {
        return `${key}=${stringify((obj as any)[key])}`;
    });
};

export const stringify = (message: any): string => {
    if (typeof message === 'string' || typeof message === 'number') {
        return message.toString();
    }

    if (message === undefined || message === null) {
        return '';
    }

    return JSON.stringify(message);
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
