export interface FailHandlerOpts {
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
    private spanTimeout: NodeJS.Timer;
    public ready: boolean = true;

    constructor(opts: FailHandlerOpts) {
        this.threshold = opts.failThreshold || Infinity;
        this.timeout = opts.failTimeout || 5000;
        this.span = opts.failSpan || 5000;
    }

    fail() {
        this.failCount++;
        if (this.failCount >= this.threshold) {
            this.ready = false;
            this.failUntil = new Date().getTime() + this.timeout;
            clearTimeout(this.spanTimeout);
            this.spanTimeout = setTimeout(
                () => this.clear(),
                Math.max(this.failUntil - new Date().getTime(), 0)
            );
            return false;
        }
        setTimeout(() => {
            this.failCount = 0;
        }, this.span);
        return true;
    }

    getTicket() {
        return new Promise((resolve) => {
            if (this.ready) {
                return resolve();
            }
            setTimeout(resolve, Math.max(this.failUntil - new Date().getTime(), 0));
        });
    }

    clear() {
        this.spanTimeout = undefined;
        this.failCount = 0;
        this.failUntil = undefined;
        this.ready = true;
    }
}
