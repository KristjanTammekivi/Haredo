import { makeQueueConfig } from './queue';
import { makeExchangeConfig } from './exchange';
import { Options } from 'amqplib';

export {
    ExchangeChain,
    QueueChain,
    ExchangePublishMethod,
    LogLevel,
    HaredoOptions,
    Haredo,
    haredo,
    LogItem
} from './haredo';

export { Queue, QueueOptions, makeQueueConfig, isHaredoQueue } from './queue';
export { Exchange, ExchangeOptions, ExchangeType, makeExchangeConfig, isHaredoExchange } from './exchange';
export { Consumer, MessageCallback } from './consumer';
export { Middleware } from './state';
export { MessageChain, preparedMessage, isHaredoPreparedMessage } from './prepared-message';
export { HaredoMessage, makeHaredoMessage, isHaredoMessage } from './haredo-message';
export { FailureBackoff, StandardBackoffOptions, standardBackoff } from './backoffs';
export {
    ChannelBrokenError,
    FailedParsingJsonError,
    HaredoClosingError,
    HaredoError
} from './errors';

export const q = makeQueueConfig;
export const e = makeExchangeConfig;

export type ConnectionOptions = Options.Connect;
