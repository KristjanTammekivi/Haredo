import { InitialChain } from './haredo';
import { Consumer } from './consumer';
import { makeQueue } from './queue';

export interface StartRpc {
    consumer: Consumer;
    add: <TReply>(correlationId: string) => { promise: Promise<TReply>, queue: string } ;
}

// TODO: gracefully close RPC on haredo close

export const startRpc = async <TMessage, TReply>(haredo: InitialChain<TMessage, TReply>): Promise<StartRpc> => {
    const openListeners = {} as Record<string, { resolve: (value: any) => void, reject: (error: Error) => void }>;
    const queue = makeQueue('').durable();
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
                queue: queue.getState().name,
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
