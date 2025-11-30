/**
 * Generic retry logic for async operations with exponential backoff
 * Supports HTTP status code-based retry decisions and network error handling
 */

/**
 * @typedef {Object} RetryConfig
 * @property {number} maxRetries - Maximum number of retry attempts
 * @property {number} baseDelayMs - Base delay in milliseconds for exponential backoff
 * @property {number} maxDelayMs - Maximum delay in milliseconds
 * @property {number[]} retryableStatusCodes - HTTP status codes that should trigger retry
 * @property {number[]} nonRetryableStatusCodes - HTTP status codes that should fail immediately
 */

/**
 * @typedef {Object} RetryableError
 * @property {number} [statusCode] - HTTP status code if applicable
 * @property {string} message - Error message
 */

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  nonRetryableStatusCodes: [400, 401, 403, 404]
};

/**
 * Explicit wrapper for network-level failures (no HTTP response received)
 */
export class NetworkError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'NetworkError';
    this.isNetworkError = true;
    this.originalError = originalError;
  }
}

/**
 * Calculate exponential backoff delay with jitter
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {RetryConfig} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
export function calculateBackoffDelay(attempt, config = DEFAULT_RETRY_CONFIG) {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determine if an error should be retried based on status code
 * @param {RetryableError} error - The error to check
 * @param {number} attempt - Current attempt number
 * @param {RetryConfig} config - Retry configuration
 * @param {Function} [logger] - Optional logger function for debug messages
 * @returns {boolean} True if should retry
 */
export function shouldRetry(error, attempt, config = DEFAULT_RETRY_CONFIG, logger = null) {
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
 * @template T
 * @param {Function} operation - Async function to execute (receives attempt number)
 * @param {Partial<RetryConfig>} [options] - Retry configuration options
 * @param {Function} [options.logger] - Optional logger with info/debug/error methods
 * @param {Function} [options.shouldRetryFn] - Custom retry decision function
 * @returns {Promise<T>} Result of the operation
 * @throws {Error} Last error if all retries are exhausted
 */
export async function withRetry(operation, options = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  const logger = options.logger;
  const shouldRetryFn = options.shouldRetryFn || shouldRetry;
  
  let lastError;
  let attempt = 0;
  
  while (true) {
    try {
      // Add delay before retry attempts
      if (attempt > 0) {
        const delay = calculateBackoffDelay(attempt - 1, config);
        logger?.info?.(`Retry attempt ${attempt}/${config.maxRetries} after ${Math.round(delay)}ms delay`);
        await sleep(delay);
      }
      
      // Execute the operation
      const result = await operation(attempt);
      
      // Log success after retries
      if (attempt > 0) {
        logger?.info?.(`Operation succeeded after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}`);
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (!shouldRetryFn(error, attempt, config, logger)) {
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
 *
 * @template T
 * @param {string} url - The request URL
 * @param {Object} fetchOptions - Options controlling fetch behavior
 * @param {Function} [fetchOptions.fetchImpl] - Custom fetch implementation (defaults to global fetch)
 * @param {Object} [fetchOptions.init] - Additional init options passed to fetch
 * @param {Object} [fetchOptions.headers] - Headers merged into init.headers
 * @param {Object} retryOptions - Options passed through to withRetry (e.g. maxRetries, logger)
 * @param {Function} [retryOptions.buildError] - (res, body, attempt) => Error instance for HTTP error responses
 * (Network errors are automatically wrapped in NetworkError.)
 * @returns {Promise<T>} Parsed JSON response
 */
export async function fetchJsonWithRetry(
  url,
  { fetchImpl, init = {}, headers = {} } = {},
  { buildError, ...retryOptions } = {}
) {
  const logger = retryOptions.logger;
  const effectiveFetch = fetchImpl || fetch;
  const mergedInit = { ...init, headers: { ...(init.headers || {}), ...headers } };

  return withRetry(
    async (attempt) => {
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
                responseBody: body
              });
          throw error;
        }
        return res.json();
      } catch (err) {
        if (err.statusCode || err.responseBody || err.isNetworkError) {
          // Already classified error
          throw err;
        }
        throw new NetworkError(err.message, err);
      }
    },
    retryOptions
  );
}
