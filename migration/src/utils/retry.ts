import { Logger } from './logger.js';

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMs: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterMs: 500,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  logger: Logger,
  options: Partial<RetryOptions> = {},
  label = 'operation',
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === opts.maxRetries) break;

      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * opts.jitterMs,
        opts.maxDelayMs,
      );

      logger.warn(`Retry ${attempt + 1}/${opts.maxRetries} for ${label} after ${Math.round(delay)}ms`, {
        error: lastError.message,
        attempt: attempt + 1,
      });

      await sleep(delay);
    }
  }

  throw lastError!;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
