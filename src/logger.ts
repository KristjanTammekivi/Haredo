import * as Debug from 'debug';
import { inspect } from 'util';

const debugLog = Debug('haredo');

interface Logger {
    (message: string): void
}

interface Loggers {
    error: Logger,
    info: Logger,
    debug: Logger
}

const loggers: Loggers = {
    error: debugLog,
    info: debugLog,
    debug: debugLog
};

export const format = (messages: any[]) => {
    return  messages
        .map(message => {
            if (typeof message === 'object') {
                return inspect(message);
            } else {
                return message;
            }
        })
        .join(' ');
}

export const makeLogger = (prefix: string) => ({
    error: (...messages: any[]) => {
        return loggers.error(format([prefix, '-'].concat(messages)));
    },
    info: (...messages: any[]) => {
        return loggers.info(format([prefix, '-'].concat(messages)));
    },
    debug: (...messages: any[]) => {
        return loggers.debug(format([prefix, '-'].concat(messages)));
    }
});

/**
 * Replace the default debug logger with your own
 */
export const setLoggers = ({ error = loggers.error, info = loggers.info, debug = loggers.debug }: Partial<Loggers>) => {
    loggers.error = error;
    loggers.info = info;
    loggers.debug = debug;
};
