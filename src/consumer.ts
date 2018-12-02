import { EventEmitter } from 'events';
import { HaredoChain } from './haredo-chain';
import { Message, Channel } from 'amqplib';
import { HaredoMessage } from './message';
import { FailHandler, IFailHandlerOpts } from './fail-handler';
import { UnpackQueueArgument, eventToPromise } from './utils';
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

    private messageList: MessageList = new MessageList();
    public emitter = new EventEmitter() as TypedEventEmitter<Events>;

    public readonly autoAck: boolean;
    public readonly prefetch: number;
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
        this.channel.once('close', () => {
            if (this.reestablish) {
                this.start();
            }
        });
        if (this.prefetch) {
            await this.channel.prefetch(this.prefetch);
        }
        const queue = this.haredoChain.getQueue();
        type MessageType = UnpackQueueArgument<T>
        const consumerInfo = await this.channel
            .consume(
                queue.name,
                async (message) => {
                    await this.failHandler.getTicket();
                    const messageInstance = new HaredoMessage<MessageType>(message, true, this.channel);
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

    async cancel(force: boolean = false) {
        if (force) {
            throw new Error('force closing consumer is not yet implemented');
        }
        if (this.closing) {
            return this.closingPromise;
        }
        this.closing = true;
        this.reestablish = false;
        this.closingPromise = new Promise(async (resolve, reject) => {
            try {
                await this.channel.cancel(this.consumerTag);
                this.emitter.emit('cancel')
                if (this.messageList.length > 0) {
                    await eventToPromise(this.messageList.emitter, 'drained');
                }
                await this.channel.close();
                resolve();
            } catch (e) {
                // TODO: log to error logger
                reject();
            }

        });
        await this.closingPromise;
        this.closed = true;
        this.emitter.emit('close');
    }

}
