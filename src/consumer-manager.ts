import { Consumer } from './consumer';
import { HaredoError } from './errors';
import { EventEmitter } from 'events';
import { TypedEventEmitter } from './events';
import { promiseMap } from './utils';
import { makeLogger } from './logger';

export enum ConsumerManagerEvents {
    drain = 'drain'
}

const { info } = makeLogger('ConsumerManager');

interface Events {
    drain: void;
}

export class ConsumerManager {
    private consumers: Consumer[] = [];
    public closed = false;
    public readonly emitter = new EventEmitter() as TypedEventEmitter<Events>;
    add(consumer: Consumer) {
        if (this.closed) {
            throw new HaredoError(`Can't add new Consumer, shutting down in progress`);
        }
        consumer.emitter.on('cancel', () => this.remove(consumer));
        this.consumers = this.consumers.concat(consumer);
    }
    remove(consumer: Consumer) {
        this.consumers = this.consumers.filter(x => x !== consumer);
    }
    async close() {
        this.closed = true;
        await promiseMap(this.consumers, (consumer) => consumer.cancel());
        info('all consumers cancelled');
        this.emitter.emit('drain');
    }
}
