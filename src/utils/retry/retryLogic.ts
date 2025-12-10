/**
 * Retry decision logic and execution
 */

import type { Logger, RetryableError, RetryConfig, RetryOptions } from './types.js';
import { DEFAULT_RETRY_CONFIG } from './types.js';
import { calculateBackoffDelay, sleep } from './backoff.js';

/**
 * Determine if an error should be retried based on status code
 */
export function shouldRetry(
  error: RetryableError,
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  logger: Logger | null = null
): boolean {
  // Don't retry if we've exhausted attempts
  if (attempt >= config.maxRetries) {
    return false;
  }

  // Explicit network error case
  if (error?.isNetworkError) {
    logger?.debug?.('NetworkError detected, will retry');
    return true;
  }

  // Fast fail on non-retryable status codes (e.g., auth errors)
  if (error.statusCode && config.nonRetryableStatusCodes.includes(error.statusCode)) {
    logger?.debug?.(`Non-retryable status code ${error.statusCode}, failing immediately`);
    return false;
  }

  // Retry on retryable status codes (rate limiting, server errors)
  if (error.statusCode && config.retryableStatusCodes.includes(error.statusCode)) {
    logger?.debug?.(`Retryable status code ${error.statusCode}, will retry`);
    return true;
  }

  // Retry on network errors (no status code)
  if (!error.statusCode) {
    logger?.debug?.('Unclassified error without statusCode, treating as network and retrying');
    return true;
  }

  return false;
}

/**
 * Execute an async operation with retry logic
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  const logger = options.logger;
  const shouldRetryFn = options.shouldRetryFn || shouldRetry;

  let attempt = 0;

  while (true) {
    try {
      // Add delay before retry attempts
      if (attempt > 0) {
        const delay = calculateBackoffDelay(attempt - 1, config);
        logger?.info?.(
          `Retry attempt ${attempt}/${config.maxRetries} after ${Math.round(delay)}ms delay`
        );
        await sleep(delay);
      }

      // Execute the operation
      const result = await operation(attempt);

      // Log success after retries
      if (attempt > 0) {
        logger?.info?.(
          `Operation succeeded after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}`
        );
      }

      return result;
    } catch (error) {
      // Check if we should retry this error
      const retryableError = error as RetryableError;
      if (!shouldRetryFn(retryableError, attempt, config, logger ?? null)) {
        throw error;
      }

      attempt++;
    }
  }
}
