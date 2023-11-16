import { HaredoMessage } from '../types';
import { omitKeysByValue } from './omit-keys-by-value';

export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

export interface LogMessage {
    level: LogLevel;
    message: string;
    component?: string;
    error?: Error;
    haredoMessage?: HaredoMessage;
}

export type LogFunction = (message: LogMessage) => void;

export type Logger = Record<LogLevel, (...messages: (string | number | boolean | null | undefined)[]) => void> & {
    component: (subComponent: string) => Logger;
    setError: (error: Error) => Logger;
    setMessage: (haredoMessage: HaredoMessage) => Logger;
};

const rejectUndefined = <T>(value: T | undefined): value is T => value !== undefined;

interface LoggerState {
    component?: string;
    error?: Error;
    haredoMessage?: HaredoMessage;
}

export const createLogger = (logFn: LogFunction, state: LoggerState = {}): Logger => ({
    debug: (...messages) => {
        logFn(omitKeysByValue({ level: 'debug', message: messages.join(' '), ...state }));
    },
    info: (...messages) => {
        logFn(omitKeysByValue({ level: 'info', message: messages.join(' '), ...state }));
    },
    warning: (...messages) => {
        logFn(omitKeysByValue({ level: 'warning', message: messages.join(' '), ...state }));
    },
    error: (...messages) => {
        logFn(omitKeysByValue({ level: 'error', message: messages.join(' '), ...state }));
    },
    component: (subComponent) =>
        // eslint-disable-next-line unicorn/no-array-callback-reference
        createLogger(logFn, { ...state, component: [state.component, subComponent].filter(rejectUndefined).join(':') }),
    setError: (newError) => createLogger(logFn, { ...state, error: newError }),
    setMessage: (haredoMessage) => createLogger(logFn, { ...state, haredoMessage })
});
