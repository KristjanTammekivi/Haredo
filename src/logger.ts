import * as Debug from 'debug';
import { format, inspect } from 'util';

const debugLog = Debug('haredo');

let logFn: (message: any) => void = debugLog;

export const debug = (...messages: any[]) => {
    logFn(messages.map(message => {
        return inspect(message);
    }).join(' '));
}

export const makeDebug = (prefix?: string) => {
    return (...messages: any[]) => debug((prefix ? [prefix] : []).concat(messages));
}
