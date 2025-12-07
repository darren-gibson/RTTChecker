/**
 * Generic retry logic for async operations with exponential backoff
 * Supports HTTP status code-based retry decisions and network error handling
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
  nonRetryableStatusCodes: number[];
}

export interface RetryableError extends Error {
  statusCode?: number;
  responseBody?: string;
  isNetworkError?: boolean;
}

export interface Logger {
  debug?: (msg: string) => void;
  info?: (msg: string) => void;
  warn?: (msg: string) => void;
  error?: (msg: string) => void;
}

export interface RetryOptions extends Partial<RetryConfig> {
  logger?: Logger;
  shouldRetryFn?: (
    error: RetryableError,
    attempt: number,
    config: RetryConfig,
    logger: Logger | null
  ) => boolean;
}

export interface FetchOptions {
  fetchImpl?: typeof fetch;
  init?: RequestInit;
  headers?: Record<string, string>;
}

export interface FetchRetryOptions extends RetryOptions {
  buildError?: (res: Response, body: string, attempt: number) => Error;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  nonRetryableStatusCodes: [400, 401, 403, 404],
};

/**
 * Explicit wrapper for network-level failures (no HTTP response received)
 */
export class NetworkError extends Error implements RetryableError {
  isNetworkError: boolean;
  originalError: Error;

  constructor(message: string, originalError: Error) {
    super(message);
    this.name = 'NetworkError';
    this.isNetworkError = true;
    this.originalError = originalError;
  }
}

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

/**
 * Perform an HTTP GET (or provided method) expecting JSON with retry logic.
 * Extracts common attempt logging, status checks, body capture on errors, and JSON parsing.
 * Domain-specific error construction can be injected via buildError / wrapNetworkError.
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  { fetchImpl, init = {}, headers = {} }: FetchOptions = {},
  { buildError, ...retryOptions }: FetchRetryOptions = {}
): Promise<T> {
  const logger = retryOptions.logger;
  const effectiveFetch = fetchImpl || fetch;
  const mergedInit = { ...init, headers: { ...(init.headers || {}), ...headers } };

  return withRetry<T>(async (attempt) => {
    logger?.debug?.(`GET ${url}${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}`);
    try {
      const res = await effectiveFetch(url, mergedInit);
      logger?.debug?.(`Response: ${res.status}`);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const error = buildError
          ? buildError(res, body, attempt)
          : Object.assign(new Error(`HTTP request failed: ${res.status} ${res.statusText}`), {
              statusCode: res.status,
              responseBody: body,
            });
        throw error;
      }
      return res.json() as Promise<T>;
    } catch (err) {
      const error = err as RetryableError;
      if (error.statusCode || error.responseBody || error.isNetworkError) {
        // Already classified error
        throw error;
      }
      throw new NetworkError(error.message, error as Error);
    }
  }, retryOptions);
}
