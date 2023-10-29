export const omitKeysByValue = <T extends Record<string, any>>(object: T, value?: T[keyof T] | undefined): T => {
    return Object.fromEntries(Object.entries(object).filter(([k, v]) => v !== value)) as T;
};
