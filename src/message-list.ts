import { EventEmitter } from 'events';
import { HaredoMessage, HaredoMessageEvents } from './haredo-message';
import { TypedEventEmitter } from './events';

export enum MessageListEvents {
    MESSAGE_LIST_DRAINED = 'drained'
}

interface Events {
    'drained': void
}

export class MessageList {
    private messages: HaredoMessage[] = [];
    public readonly emitter = new EventEmitter() as TypedEventEmitter<Events>;
    get length() {
        return this.messages.length;
    }
    add(message: HaredoMessage) {
        this.messages = this.messages.concat([message]);
        message.emitter.once(HaredoMessageEvents.MESSAGE_HANDLED, () => {
            this.remove(message);
            /* istanbul ignore else */
            if (this.messages.length === 0) {
                this.emitter.emit(MessageListEvents.MESSAGE_LIST_DRAINED);
            }
        });
    }
    remove(message: HaredoMessage) {
        this.messages = this.messages.filter(x => x !== message);
    }
}
