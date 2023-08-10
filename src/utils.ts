export const merge = <T>(base: T, top: T): T => {
    return Object.assign({}, base, top);
};
