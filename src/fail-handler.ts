export interface FailHandlerOpts {
    failThreshold: number;
    failTimeout: number;
    failSpan: number;
}

export class FailHandler {
    public threshold: number;
    public timeout: number;
    public span: number;
    public failCount: number = 0;
    public failUntil: number;
    public timeouts = [] as NodeJS.Timeout[];

    constructor(opts: FailHandlerOpts) {
        this.threshold = opts.failThreshold || Infinity;
        this.timeout = opts.failTimeout || 5000;
        this.span = opts.failSpan || 5000;
    }

    fail() {
        this.failCount++;
        if (this.failCount >= this.threshold) {
            this.failUntil = new Date().getTime() + this.timeout;
            return false;
        }
        const timeout = setTimeout(() => {
            this.failCount--;
            this.timeouts = this.timeouts.filter(x => x !== timeout);
        }, this.span);

        this.timeouts = this.timeouts.concat(timeout);

        return true;
    }

    getTicket() {
        return new Promise((resolve) => {
            if (this.failUntil < new Date().getTime()) {
                return resolve();
            }
            setTimeout(resolve, Math.max(this.failUntil - new Date().getTime(), 0));
        });
    }

    clear() {
        this.failCount = 0;
        this.failUntil = new Date().getTime();
        this.timeouts.forEach(x => clearTimeout(x));
        this.timeouts = [];
    }
}
