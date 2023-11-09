import EventEmitter = require('events');

export class TypedEventEmitter<T extends Record<string, any>> extends EventEmitter {
    emit<K extends keyof T & string>(type: K, data: T[K]): boolean {
        return super.emit(type, data);
    }

    once<K extends keyof T & string>(type: K, callback: (data: T[K]) => any): this {
        return super.once(type, callback);
    }

    on<K extends keyof T & string>(type: K, callback: (data: T[K]) => any): this {
        return super.on(type, callback);
    }
}
