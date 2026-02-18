import { sleep } from './retry.js';

export class RateLimiter {
  private queue: Array<() => void> = [];
  private activeCount = 0;
  private lastRequestTime = 0;

  constructor(
    private maxConcurrency: number = 5,
    private minGapMs: number = 200,
  ) {}

  async acquire(): Promise<void> {
    // Wait for concurrency slot
    while (this.activeCount >= this.maxConcurrency) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }

    // Enforce minimum gap
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minGapMs) {
      await sleep(this.minGapMs - elapsed);
    }

    this.activeCount++;
    this.lastRequestTime = Date.now();
  }

  release(): void {
    this.activeCount--;
    const next = this.queue.shift();
    if (next) next();
  }

  async pauseFor(ms: number): Promise<void> {
    await sleep(ms);
  }
}
