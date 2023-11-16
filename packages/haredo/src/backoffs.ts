import { delay } from './utils/delay';

export interface FailureBackoff {
    /**
     * Triggered when the message callback returns a rejection
     */
    fail?(error: Error): void;
    /**
     * Triggered when a message callback resolves
     */
    pass?(): void;
    /**
     * Triggered when a message is nacked
     */
    nack?(requeue: boolean): void;
    /**
     * Triggered when a message is acked
     */
    ack?(): void;
    /**
     * Return a promise that will be resolved when the system is ready for next message
     */
    take(): Promise<void>;
}

export interface StandardBackoffOptions {
    /**
     * Set the amount of fails the system will allow in {failSpan} milliseconds
     * before the subscriber waits for {failTimeout} milliseconds until passing
     * the next message to subscriber callback.
     */
    failThreshold: number;
    /**
     * Set the failSpan, the amount of time in milliseconds during which {failThreshold}
     * amount of nacked messages can happen before the subscriber waits {failTimeout}
     * milliseconds until passing the next message to subscriber callback.
     */
    failSpan: number;
    /**
     * Set the failTimeout, the amount of time in milliseconds to wait until
     * passing the next message to subscriber callback after {failThreshold}
     * amount of nacked messages happen within {failSpan}
     */
    failTimeout: number;
}

const standardBackoffDefaults: StandardBackoffOptions = {
    failThreshold: 3,
    failSpan: 5000,
    failTimeout: 5000
};

export const standardBackoff = ({
    failThreshold = standardBackoffDefaults.failThreshold,
    failSpan = standardBackoffDefaults.failSpan,
    failTimeout = standardBackoffDefaults.failTimeout
}: Partial<StandardBackoffOptions> = {}) => {
    let errors: Date[] = [];
    let timeout: Promise<void>;
    return {
        nack: (requeue) => {
            if (requeue) {
                const error = new Date();
                errors = [...errors, error];
                if (errors.length >= failThreshold) {
                    timeout = delay(failTimeout);
                }
                setTimeout(() => {
                    errors = errors.filter((x) => x !== error);
                }, failSpan);
            }
        },
        take: async () => {
            await timeout;
        }
    } satisfies FailureBackoff;
};
