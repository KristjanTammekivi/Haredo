import { FailedParsingJsonError } from './errors';

export const promiseMap = async <T, U>(arr: T[], cb: (obj: T, i: number, arr: T[]) => U) => {
    return Promise.all<U>(arr.map(cb));
};

export const head = <T>(arr: T[]): T => arr[0];
export const tail = <T>(arr: T[]): T[] => arr.slice(1);

export const delay = (ms: number) => {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
};

type notany = object | string | number | undefined | null;
export type MergeTypes<T, U> = T extends notany ? U extends notany ? T | U : T : U;

export const omit = <T, K extends keyof T>(item: T, ...keys: K[]) => {
    const omittedItem = {} as Omit<T, K>;
    for (const [key, value] of Object.entries(item)) {
        if (!keys.includes(key as K)) {
            omittedItem[key as Exclude<keyof T, K>] = value;
        }
    }
    return omittedItem;
};

export const omitUndefined = <T extends Record<string, any>>(item: T) => {
    const undefinedKeys = Object.keys(item).filter((key) => {
        return item[key] === undefined;
    });
    return omit(item, ...undefinedKeys) as T;
};

export const merge = <T>(base: T, top: T): T => {
    return Object.assign({}, base, top);
};

export const parseJSON = (data: string) => {
    try {
        return JSON.parse(data);
    } catch {
        throw new FailedParsingJsonError(data);
    }
};

export interface TicketMachine {
    take(): Promise<Function>;
    play(): void;
    pause(): void;
    stop(): void;
    check(): void;
}

export const makeTicketMachine = (): TicketMachine => {
    let paused = false;
    let waiting = false;
    let stopped = false;
    const tickets: { resolve: Function; reject: Function; }[] = [];
    const check = () => {
        if (stopped) {
            throw new Error('Ticketmachine has been stopped, no new tickets will be forthcoming');
        }
        if (paused || waiting) {
            return;
        }
        const ticket = tickets.shift();
        if (!ticket) {
            return;
        }
        waiting = true;
        ticket.resolve(() => {
            waiting = false;
            check();
        });
    };
    const play = () => {
        paused = false;
        check();
    };
    const pause = () => {
        paused = true;
    };
    const stop = (e = new Error()) => {
        stopped = true;
        tickets.forEach(x => x.reject(e));
        tickets.length = 0;
    };
    const take = async () => {
        let resolve: Function;
        let reject: Function;
        const promise = new Promise<Function>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        tickets.push({ resolve, reject });
        check();
        return promise;
    };
    return {
        take,
        check,
        pause,
        play,
        stop
    };
};

export const walkUntilEnd = <T>(arr: T[]): () => T => {
    let currentIndex = 0;
    return () => {
        const item = arr[currentIndex];
        if (currentIndex + 1 < arr.length) {
            currentIndex += 1;
        }
        return item;
    };
};
