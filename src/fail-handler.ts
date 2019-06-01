import { makeLogger } from './logger';

const { debug } = makeLogger('FailHandler');

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
    public failUntil: number = 0;
    public timeouts = [] as NodeJS.Timeout[];

    constructor(opts: FailHandlerOpts) {
        this.threshold = opts.failThreshold || Infinity;
        this.timeout = opts.failTimeout || 5000;
        this.span = opts.failSpan || 5000;
    }

    fail() {
        this.failCount += 1;
        if (this.failCount >= this.threshold) {
            this.failUntil = new Date().getTime() + this.timeout;
            debug('Failhandler threshold reached, waiting until', new Date(this.failUntil));
            return false;
        }
        const timeout = setTimeout(() => {
            this.failCount -= 1;
            this.timeouts = this.timeouts.filter(x => x !== timeout);
        }, this.span);

        this.timeouts = this.timeouts.concat(timeout);

        return true;
    }

    getTicket() {
        return new Promise((resolve) => {
            if (this.failUntil <= new Date().getTime()) {
                return resolve();
            }
            setTimeout(resolve, Math.max(this.failUntil - new Date().getTime(), 0));
        });
    }
}
