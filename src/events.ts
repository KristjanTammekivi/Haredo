import { EventEmitter } from 'events';
import { Omit } from './utils';

interface TypedEE<T> {
    addListener<K extends keyof T>(event: K, listener: (arg?: T[K]) => any): this;
    on<K extends keyof T>(event: K, listener: (arg?: T[K]) => any): this;
    once<K extends keyof T>(event: K, listener: (arg?: T[K]) => any): this;
    removeListener<K extends keyof T>(event: K, listener: (arg?: T[K]) => any): this;
    removeAllListeners<K extends keyof T>(event?: K): this;
    listeners<K extends keyof T>(event: K): ((arg?: T[K]) => any)[];
    emit<K extends keyof T>(event: K, arg?: T[K]): boolean;
    listenerCount<K extends keyof T>(type: K): number;
    prependListener<K extends keyof T>(event: K, listener: (arg?: T[K]) => any): this;
    prependOnceListener<K extends keyof T>(event: K, listener: (arg?: T[K]) => any): this;
}

export type TypedEventEmitter<T> = TypedEE<T> & Omit<
    EventEmitter,
    'addListener' | 'on' | 'once' | 'removeListener' |
    'removeAllListeners' | 'listeners' | 'emit' |
    'listenerCount' | 'prependListener' | 'prependOnceListener'>;
