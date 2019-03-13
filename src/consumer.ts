import { EventEmitter } from 'events';
import { HaredoChain } from './haredo-chain';
import { Message, Channel } from 'amqplib';
import { HaredoMessage } from './haredo-message';
import { FailHandler, IFailHandlerOpts } from './fail-handler';
import { UnpackQueueArgument, eventToPromise, delayPromise } from './utils';
import { MessageList } from './message-list';
import { TypedEventEmitter } from './events';

export type messageCallback<T = any> = (message: HaredoMessage<T>) => any;

export interface IConsumerOpts {
    prefetch: number;
    autoAck: boolean;
    reestablish: boolean;
    fail: IFailHandlerOpts;
}

const CONSUMER_DEFAULTS: IConsumerOpts = {
    autoAck: true,
    prefetch: 0,
    reestablish: false,
    fail: {
        failSpan: 5000,
        failThreshold: Infinity,
        failTimeout: 5000
    }
}

export enum ConsumerEvents {
    MESSAGE_HANDLED = 'message_handled',
    MESSAGE_ACKED = 'message_acked',
    MESSAGE_NACKED = 'message_nacked'
}

interface Events {
    cancel: void;
    close: void;
    reestablished: void;
}

export class Consumer<T = any> {
    public consumerTag: string;

    public channel: Channel;
    public closing = false;
    public closed = false;
    public consumerCancelled = false;
    private messageListDrained = false;

    private messageList: MessageList = new MessageList();
    public emitter = new EventEmitter() as TypedEventEmitter<Events>;

    public autoAck: boolean;
    public prefetch: number;
    public reestablish: boolean;
    private failHandler: FailHandler;

    private closingPromise: Promise<void>;

    constructor(
        private haredoChain: HaredoChain,
        opts: IConsumerOpts,
        private cb: messageCallback<UnpackQueueArgument<T>>
    ) {
        const defaultedOpts = Object.assign({}, CONSUMER_DEFAULTS, opts);
        this.haredoChain = haredoChain;
        this.cb = cb;
        this.autoAck = defaultedOpts.autoAck;
        this.prefetch = defaultedOpts.prefetch;
        this.reestablish = defaultedOpts.reestablish;
        this.failHandler = new FailHandler(defaultedOpts.fail);
    }

    async ack(message: Message) {
        this.channel.ack(message, false);
    }

    async nack(message: Message, requeue: boolean = true) {
        this.channel.nack(message, false, requeue);
        this.failHandler.fail();
    }

    async start() {
        this.channel = await this.haredoChain.getChannel();
        this.channel.once('close', async () => {
            if (this.reestablish && !this.closing) {
                await delayPromise(500);
                await this.start();
            }
        });
        if (this.prefetch) {
            await this.setPrefetch(this.prefetch);
        }
        const queue = this.haredoChain.getQueue();
        type MessageType = UnpackQueueArgument<T>
        const consumerInfo = await this.channel
            .consume(
                queue.name,
                async (message) => {
                    console.log(',,,,,', message);
                    await this.failHandler.getTicket();
                    const messageInstance = new HaredoMessage<MessageType>(message, true, this);
                    this.messageList.add(messageInstance);
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

    async setPrefetch(count: number) {
        this.prefetch = count;
        await this.channel.prefetch(count);
    }

    async cancel(force: boolean = false) {
        this.closing = true;
        if (this.closed) {
            return;
        }
        if (force && !this.messageListDrained) {
            this.closingPromise = Promise.resolve(this.channel.close());
            await this.closingPromise;
            this.closed = true;
            this.emitter.emit('close');
            return;
        }
        if (this.closing) {
            return this.closingPromise;
        }
        this.reestablish = false;
        this.closingPromise = this.gracefulCancel();
        await this.closingPromise;
    }

    private async gracefulCancel() {
        await this.channel.cancel(this.consumerTag);
        this.consumerCancelled = true;
        this.emitter.emit('cancel');
        if (this.messageList.length > 0 && !this.closed) {
            await eventToPromise(this.messageList.emitter, 'drained');
        }
        this.messageListDrained = true;
        if (!this.closed) {
            await this.channel.close();
            this.closed = true;
            this.emitter.emit('close');
        }
    }

}
