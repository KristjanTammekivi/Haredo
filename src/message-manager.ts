import { HaredoMessage } from './haredo-message';
import { typedEventToPromise } from './events';
import { promiseMap } from './utils';

export enum MessageManagerEvents {
    MESSAGE_MANAGER_DRAINED = 'drained'
}

export const makeMessageManager = () => {
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
        if (isDrained()) {
            return;
        }
        await promiseMap(messages, async ({ isHandled, emitter }) => {
            /* istanbul ignore if */
            if (isHandled()) {
                return;
            }
            await typedEventToPromise(emitter, 'handled');
        });
    };
    return {
        length,
        isDrained,
        add,
        remove,
        drain
    };
};
