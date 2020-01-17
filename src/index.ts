import { makeQueueConfig } from './queue';
import { makeExchangeConfig } from './exchange';

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

export { Queue, QueueOptions, makeQueueConfig } from './queue';
export { Exchange, ExchangeOptions, ExchangeType, makeExchangeConfig } from './exchange';
export { Consumer, MessageCallback } from './consumer';
export { Middleware } from './state';
export { MessageChain, preparedMessage } from './prepared-message';
export { HaredoMessage } from './haredo-message';
export {
    ChannelBrokenError,
    FailedParsingJsonError,
    HaredoClosingError,
    HaredoError
} from './errors';

export const q = makeQueueConfig;
export const e = makeExchangeConfig;
