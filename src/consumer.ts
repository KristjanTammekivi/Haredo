import { EventEmitter } from 'events';
import { HaredoChain } from './haredo-chain';
import { Message, Channel } from 'amqplib';
import { HaredoMessage } from './message';

export type messageCallback = (message: HaredoMessage) => any;

export interface IConsumerOpts {
    prefetch: number;
    autoAck: boolean;
}

export class Consumer extends EventEmitter {
    public consumerTag: string;

    private haredoChain: HaredoChain;
    private cb: messageCallback;
    private channel: Channel;
    public readonly autoAck: boolean;
    public readonly prefetch: number;

    constructor(haredoChain: HaredoChain, opts: IConsumerOpts, cb: messageCallback) {
        super();
        this.haredoChain = haredoChain;
        this.cb = cb;
        this.autoAck = opts.autoAck;
        this.prefetch = opts.prefetch;
        this.start();
    }

    async ack(message: Message) {
        this.channel.ack(message, false)
    }

    async nack(message: Message, requeue: boolean = true) {
        this.channel.nack(message, false, requeue);
    }

    async start() {
        this.channel = await this.haredoChain.getChannel();
        if (this.prefetch) {
            await this.channel.prefetch(this.prefetch);
        }
        const consumerInfo = await this.channel
            .consume(
                this.haredoChain.getQueue().name,
                async (message) => {
                    const messageInstance = new HaredoMessage(message, this);
                    try {
                        await this.cb(messageInstance);
                        if (this.autoAck) {
                            await messageInstance.ack();
                        }
                    } catch (e) {
                        if (this.autoAck) {
                            await messageInstance.nack();
                        }
                    }
            });
        this.consumerTag = consumerInfo.consumerTag;
    }

    async cancel() {
        this.channel.cancel(this.consumerTag);
    }

}
