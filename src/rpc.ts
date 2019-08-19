import { InitialChain } from './haredo';
import { TimeoutError } from './errors';
import { Consumer } from './consumer';
import { Queue } from './queue';

export interface StartRpc {
    consumer: Consumer;
    add: <TReply>(correlationId: string) => { promise: Promise<TReply>, queue: string } ;
}

export const startRpc = async <TMessage, TReply>(haredo: InitialChain<TMessage, TReply>): Promise<StartRpc> => {
    const openListeners = {} as Record<string, { resolve: (value: any) => void, reject: (error: Error) => void }>;
    const queue = new Queue('').durable();
    return {
        consumer: await haredo
            .queue(queue)
            .noAck()
            .subscribe(({ correlationId, data }) => {
                const listener = openListeners[correlationId];
                if (listener) {
                    listener.resolve(data);
                    delete openListeners[correlationId];
                }
            }),
        add: (correlationId: string) => {
            return {
                queue: queue.name,
                promise: new Promise((resolve, reject) => {
                    openListeners[correlationId] = { resolve, reject };
                })
            };
        }
    };
};

export const generateCorrelationId = () => {
    return `rpc-${Date.now()}-${Math.random().toString(36).split('.')[1]}`;
};
