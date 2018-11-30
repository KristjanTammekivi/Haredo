import { EventEmitter } from 'events';
import { HaredoMessage, MessageEvents } from './message';

export enum MessageListEvents {
    MESSAGE_LIST_DRAINED = 'drained'
}

export class MessageList extends EventEmitter {
    private messages: HaredoMessage[] = [];
    get length() {
        return this.messages.length;
    }
    add(message: HaredoMessage) {
        this.messages = this.messages.concat([message]);
        message.once(MessageEvents.MESSAGE_HANDLED, () => {
            this.remove(message);
            if (this.messages.length === 0) {
                this.emit(MessageListEvents.MESSAGE_LIST_DRAINED);
            }
        });
    }
    remove(message: HaredoMessage) {
        this.messages = this.messages.filter(x => x !== message);
    }
}