import { InitialChain } from './haredo';
import { Consumer } from './consumer';
import { makeQueueConfig } from './queue';
import { HaredoClosingError } from './errors';
import { TypedEventEmitter, makeEmitter, typedEventToPromise } from './events';
import { Loggers } from './state';

export interface Events {
    resolve: void;
    reject: void;
    drain: void;
}

export interface StartRpc {
    consumer: Consumer;
    emitter: TypedEventEmitter<Events>;
    add<TReply>(correlationId: string): { promise: Promise<TReply>, queue: string } ;
    close(): Promise<void>;
}

// TODO: add ability to timeout
// TODO: add ability to force close

export const startRpc = async <TMessage, TReply>(haredo: InitialChain<TMessage, TReply>, { info, debug, warning, error }: Loggers): Promise<StartRpc> => {
    const openListeners = {} as Record<string, { resolve: (value: any) => void, reject: (error: Error) => void }>;
    const queue = makeQueueConfig('').durable(false).autoDelete();
    let isClosing = false;
    const emitter = makeEmitter<Events>();
    info({ component: 'RPC', msg: 'starting consumer' });
    const consumer = await haredo
        .queue(queue)
        .noAck()
        .subscribe(({ correlationId, data }) => {
            const listener = openListeners[correlationId];
            if (listener) {
                debug({ component: 'RPC', msg: `resolving correlationId ${correlationId}` });
                listener.resolve(data);
                delete openListeners[correlationId];
                emitter.emit('resolve');
                if (isDrained()) {
                    emitter.emit('drain');
                }
            } else {
                warning({ component: 'RPC', msg: `received unknown correlationId ${correlationId}` });
            }
        });
    const add = <TReply>(correlationId: string) => {
        if (isClosing) {
            error({ component: 'RPC', msg: 'not attaching rpc listener since RPC service is closing' });
            throw new HaredoClosingError();
        }
        return {
            queue: queue.getName(),
            // tslint:disable-next-line: no-useless-cast
            promise: new Promise((resolve, reject) => {
                debug({ component: 'RPC', msg: `attached listening for correlationId ${correlationId}` });
                openListeners[correlationId] = { resolve, reject };
            }) as Promise<TReply>
        };
    };
    const isDrained = () => {
        return Object.keys(openListeners).length === 0;
    };
    const close = async () => {
        info({ component: 'RPC', msg: 'closing...' });
        isClosing = true;
        if (isDrained()) {
            info({ component: 'RPC', msg: 'no more listeners, closing consumer' });
            await consumer.close();
            info({ component: 'RPC', msg: 'closed' });
            return;
        }
        info({ component: 'RPC', msg:  `waiting for ${ Object.keys(openListeners).length } replies before closing` });
        await typedEventToPromise(emitter, 'drain');
        info({ component: 'RPC', msg:  'no more listeners, closing consumer' });
        await consumer.close();
        info({ component: 'RPC', msg:  'closed' });
    };
    return {
        consumer,
        emitter,
        add,
        close
    };
};

export const generateCorrelationId = () => {
    return `rpc-${Date.now()}-${Math.random().toString(36).split('.')[1]}`;
};
