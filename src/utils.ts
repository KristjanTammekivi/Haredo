export const keyValuePairs = (obj: Object) => {
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
