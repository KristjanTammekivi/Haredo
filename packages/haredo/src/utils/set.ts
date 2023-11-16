import { omitKeysByValue } from './omit-keys-by-value';

export const set = <T extends Record<string, any>>(object: T, key: keyof T, value: T[keyof T] | undefined): T => {
    return omitKeysByValue({ ...object, [key]: value });
};
