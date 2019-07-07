import { Queue } from './queue';
import { ConnectionManager } from './connection-manager';
import { Consumer } from './consumer';
import { HaredoChain } from './haredo-chain';

export class RpcService {
    private queue = new Queue().exclusive();
    private consumer: Consumer;
    private toResolve = {} as { [correlationId: string]: { resolve: Function, reject: Function } };
    private chain: HaredoChain;
    private startPromise: Promise<any>;
    public started = false;
    public closing = false;
    constructor(private connectionManager: ConnectionManager) {
        this.chain = new HaredoChain(this.connectionManager, {})
            .queue(this.queue);
    }
    async start() {
        if (this.startPromise) {
            return this.startPromise;
        }
        this.startPromise = this.internalStart();
        return this.startPromise;
    }
    async stop() {
        this.closing = true;
        return this.consumer && this.consumer.cancel();
    }
    getQueueName() {
        return this.queue.name;
    }
    async internalStart() {
        this.consumer = await this.chain.subscribe((data, message) => {
            const promiseFunctions = this.toResolve[message.raw.properties.correlationId];
            if (promiseFunctions) {
                promiseFunctions.resolve(data);
            }
            delete this.toResolve[message.raw.properties.correlationId];
        });
        this.consumer.emitter.on('cancel', () => this.stop());
    }
    async listen<T = any>(correlationId: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.toResolve[correlationId] = { resolve, reject };
        });
    }
    public generateCorrelationId() {
        return `rpc-${Date.now()}-${Math.random().toString(36).split('.')[1]}`;
    }
}
