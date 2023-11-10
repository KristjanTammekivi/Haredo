export const createTracker = () => {
    let inFlight = 0;
    let resolve: undefined | (() => void);
    return {
        inc: () => {
            inFlight++;
        },
        dec: () => {
            inFlight--;
            if (inFlight === 0) {
                resolve?.();
            }
        },
        wait: async () => {
            if (inFlight === 0) {
                return;
            }
            await new Promise<void>((r) => {
                resolve = r;
            });
        }
    };
};
