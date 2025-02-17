class Semaphore {
    private queue: (() => void)[] = [];
    private available: number;

    constructor(maxConcurrent: number) {
        this.available = maxConcurrent;
    }

    async acquire(): Promise<void> {
        if (this.available > 0) {
            this.available--;
            return;
        }

        return new Promise(resolve => {
            this.queue.push(resolve);
        });
    }

    release(): void {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) next();
        } else {
            this.available++;
        }
    }
}

export default Semaphore;