import { Queue } from './queue';
import { Exchange } from './exchange';

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

export type UnpackQueueArgument<T> = T extends Queue<infer U> ? U : any;
export type UnpackExchangeArgument<T> = T extends Exchange<infer U> ? U : any;

type notany = Object | string | number | undefined | null;

export type MergeTypes<T, U> = T extends notany ? U extends notany ? T | U : T : U;
