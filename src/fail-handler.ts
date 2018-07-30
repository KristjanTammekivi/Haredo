interface IFailHandlerOpts {
    failThreshold: number;
    failTimeout: number;
    failSpan: number;
}

export class FailHandler {
    private threshold: number;
    private timeout: number;
    private span: number;
    private failCount: number = 0;
    private failUntil: number;
    private spanTimeout: number;
    private ready: boolean = true;

    constructor(opts: IFailHandlerOpts) {
        this.threshold = opts.failThreshold || Infinity;
        this.timeout = opts.failTimeout || 5000;
        this.span = opts.failSpan || 5000;
    }

    fail() {
        this.failCount++;
        return this.check();
    }

    getTicket() {
        return new Promise((resolve) => {
            if (this.ready) {
                return resolve();
            }
            setTimeout(resolve, Math.max(this.failUntil - new Date().getTime(), 0));
        });
    }

    check() {
        if (!this.ready) {
            return false;
        }
        if (this.failCount > this.threshold) {
            this.ready = false;
            this.failUntil = new Date().getTime() + this.timeout;
            setTimeout(this.clear, Math.max(this.failUntil - new Date().getTime(), 0));
            return false;
        }
        return true;
    }

    clear() {
        this.failCount = 0;
        this.failUntil = null;
        this.ready = true;
    }
}
