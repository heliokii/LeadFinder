/**
 * A tiny sequential rate limiter. Nominatim's usage policy caps free,
 * unauthenticated use at ~1 request/second, and Overpass's public
 * instances ask for similarly conservative, bursty-free usage. This
 * queue guarantees a minimum gap between calls made through it,
 * regardless of how many callers fire at once.
 *
 * This is deliberately simple (module-level, in-process) because this
 * app is a single-user local tool, not a multi-tenant service.
 */

type Task<T> = () => Promise<T>;

class RateLimiter {
  private queue: Array<() => void> = [];
  private lastRunAt = 0;
  private running = false;

  constructor(private minIntervalMs: number) {}

  schedule<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await task());
        } catch (err) {
          reject(err);
        }
      });
      void this.drain();
    });
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    while (this.queue.length > 0) {
      const now = Date.now();
      const wait = Math.max(0, this.minIntervalMs - (now - this.lastRunAt));
      if (wait > 0) await sleep(wait);
      const next = this.queue.shift();
      this.lastRunAt = Date.now();
      if (next) await next();
    }
    this.running = false;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const minInterval = Number(process.env.OSM_MIN_REQUEST_INTERVAL_MS ?? 1200);

// Shared limiter for every outgoing OSM request in this process.
export const osmRateLimiter = new RateLimiter(minInterval);
