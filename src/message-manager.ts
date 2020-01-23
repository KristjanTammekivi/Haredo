import { HaredoMessage } from './haredo-message';
import { typedEventToPromise } from './events';
import { promiseMap } from './utils';
import { Loggers } from './state';

export enum MessageManagerEvents {
    MESSAGE_MANAGER_DRAINED = 'drained'
}

export const makeMessageManager = (logger: Loggers) => {
    let messages: HaredoMessage[] = [];
    const length = () => messages.length;
    const isDrained = () => length() === 0;
    const add = (message: HaredoMessage) => {
        messages = messages.concat(message);
        message.emitter.once('handled', () => {

        });
    };
    const remove = (message: HaredoMessage) => {
        messages = messages.filter(x => x !== message);
    };
    const drain = async () => {
        logger.info('MessageManager', 'Draining');
        if (!isDrained()) {
            await promiseMap(messages, async ({ data, isHandled, emitter }) => {
                /* istanbul ignore if */
                if (isHandled()) {
                    return;
                }
                await typedEventToPromise(emitter, 'handled');
            });
        }
        logger.info('MessageManager', 'No messages left, done');
    };
    return {
        length,
        isDrained,
        add,
        remove,
        drain
    };
};
