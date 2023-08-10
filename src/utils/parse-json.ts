import { FailedParsingJsonError } from '../errors';

export const parseJSON = <T>(data: string | null) => {
    if (data === null) {
        return null;
    }
    try {
        return JSON.parse(data) as T;
    } catch {
        throw new FailedParsingJsonError(data);
    }
};
