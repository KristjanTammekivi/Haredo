export const Queue = <T = unknown>(name?: string): QueueInterface<T> => ({
    name
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface QueueInterface<TMESSAGE = unknown> {
    name: string | undefined;
}
