/**
 * Retry mechanism type definitions
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
