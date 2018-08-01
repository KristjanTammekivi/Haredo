import { EventEmitter } from 'events';
import { HaredoChain } from './haredo-chain';
import { Message, Channel } from 'amqplib';
import { HaredoMessage } from './message';
import { FailHandler, IFailHandlerOpts } from './fail-handler';

export type messageCallback = (message: HaredoMessage) => any;

export interface IConsumerOpts {
    prefetch: number;
    autoAck: boolean;
    fail: IFailHandlerOpts;
}

const CONSUMER_DEFAULTS: IConsumerOpts = {
    autoAck: true,
    prefetch: 0,
    fail: {
        failSpan: 5000,
        failThreshold: Infinity,
        failTimeout: 5000
    }
}

export class Consumer extends EventEmitter {
    public consumerTag: string;

    private haredoChain: HaredoChain;
    private cb: messageCallback;
    private channel: Channel;
    public readonly autoAck: boolean;
    public readonly prefetch: number;
    private failHandler: FailHandler;

    constructor(haredoChain: HaredoChain, opts: IConsumerOpts, cb: messageCallback) {
        super();
        const defaultedOpts: IConsumerOpts = Object.assign({}, CONSUMER_DEFAULTS, opts);
        this.haredoChain = haredoChain;
        this.cb = cb;
        this.autoAck = defaultedOpts.autoAck;
        this.prefetch = defaultedOpts.prefetch;
        this.failHandler = new FailHandler(defaultedOpts.fail);
        this.start();
    }

    async ack(message: Message) {
        this.channel.ack(message, false)
    }

    async nack(message: Message, requeue: boolean = true) {
        this.channel.nack(message, false, requeue);
        this.failHandler.fail();
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
                    await this.failHandler.getTicket();
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
