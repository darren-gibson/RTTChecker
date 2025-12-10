/**
 * HTTP fetch with retry logic
 */

import type { FetchOptions, FetchRetryOptions } from './types.js';
import { NetworkError } from './types.js';
import { withRetry } from './retryLogic.js';

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
      const error = err as Error & {
        statusCode?: number;
        responseBody?: string;
        isNetworkError?: boolean;
      };
      if (error.statusCode || error.responseBody || error.isNetworkError) {
        // Already classified error
        throw error;
      }
      throw new NetworkError(error.message, error);
    }
  }, retryOptions);
}
