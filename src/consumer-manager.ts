import { EventEmitter } from 'events';
import { TypedEventEmitter } from './events';
import { Consumer } from './consumer';
import { promiseMap } from './utils';

interface Events {
    drained: void;
}

export class ConsumerManager {
    private consumerList: Consumer[] = [];
    public readonly emitter = new EventEmitter as TypedEventEmitter<Events>
    get length() {
        return this.consumerList.length;
    }
    drain() {
        return promiseMap(this.consumerList, async (consumer) => {
            await consumer.cancel();
            this.remove(consumer);
        });
    }
    add(consumer: Consumer) {
        this.consumerList = this.consumerList.concat(consumer);
        consumer.emitter.on('close', () => {
            this.remove(consumer);
        });
    }
    remove(consumer: Consumer) {
        this.consumerList = this.consumerList.filter(x => x !== consumer);
        /* istanbul ignore else */
        if (this.length === 0) {
            this.emitter.emit('drained');
        }
    }
}
