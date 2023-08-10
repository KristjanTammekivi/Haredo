export const castArray = <T>(value: T | T[] | undefined | null): T[] => {
    if (value === undefined || value === null) {
        return [];
    }
    if (Array.isArray(value)) {
        return value;
    }
    return [value];
};
