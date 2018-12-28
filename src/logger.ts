import * as Debug from 'debug';
import { format } from 'util';
const debugLog = Debug('haredo');

let debugLogFn: (message: any) => void = debugLog;

/* istanbul ignore next */
export const setLogging = (fn: (message: any) => void) => {
    debugLogFn = fn;
};

export const debug = (formatter: any, ...args: any[]) => {
    debugLogFn(format(formatter, ...args));
}
