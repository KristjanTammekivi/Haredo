import { HaredoMessage } from './haredo-message';
import { TypedEventEmitter } from './events';
import { EventEmitter } from 'events';

export enum MessageManagerEvents {
    MESSAGE_MANAGER_DRAINED = 'drained'
}

interface Events {
    [MessageManagerEvents.MESSAGE_MANAGER_DRAINED]: void;
}

export class MessageManager<T = unknown> {
    private messages: HaredoMessage<T>[] = [];
    public readonly emitter = new EventEmitter() as TypedEventEmitter<Events>
    get length() {
        return this.messages.length;
    }
    isDrained() {
        return this.length === 0;
    }
    add(message: HaredoMessage<T>) {
        this.messages = this.messages.concat(message);
    }
    remove(message: HaredoMessage) {
        this.messages = this.messages.filter(x => x !== message);
    }
}