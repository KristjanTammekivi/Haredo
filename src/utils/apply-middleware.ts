import { HaredoMessage } from '../haredo-message';
import { SubscribeCallback } from '../types';

export interface Middleware<T = unknown> {
    /**
     * @param message The received message
     * @param next A function that returns a promise for the next item in the callback stack.
     * If you don't call it and don't ack/nack the message then it will be called for you
     */
    (message: HaredoMessage<T>, next: () => Promise<void>): Promise<void> | void;
}
export const applyMiddleware = async <T>(
    [head, ...tail]: Middleware<T>[],
    callback: SubscribeCallback<T>,
    message: HaredoMessage<T>
) => {
    if (head) {
        let nextWasCalled = false;
        await head(message, async () => {
            nextWasCalled = true;
            if (message.isHandled()) {
                // Log error
                return;
            }
            return applyMiddleware(tail, callback, message);
        });
        if (!nextWasCalled && !message.isHandled()) {
            await applyMiddleware(tail, callback, message);
        }
    } else {
        await callback(message.data, message);
    }
};
