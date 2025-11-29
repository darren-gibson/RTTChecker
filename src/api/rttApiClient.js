/**
 * @typedef {import('../types.js').RTTSearchResponse} RTTSearchResponse
 */

import { config } from "../config.js";
import { loggers } from "../utils/logger.js";
import { RTTApiError } from "../errors.js";

const log = loggers.bridge;

/**
 * Encode credentials for HTTP Basic Authentication.
 * @param {string} u - Username
 * @param {string} p - Password
 * @returns {string} Base64-encoded credentials
 */
export const b64 = (u, p) => Buffer.from(`${u}:${p}`).toString("base64");

/**
 * Retry configuration for RTT API calls
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  // Status codes that should be retried with exponential backoff
  retryableStatusCodes: [429, 500, 502, 503, 504],
  // Status codes that should fail immediately (no retry)
  nonRetryableStatusCodes: [400, 401, 403, 404]
};

/**
 * Calculate exponential backoff delay with jitter
 * @param {number} attempt - Current attempt number (0-indexed)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt) {
  const exponentialDelay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
  return Math.min(exponentialDelay + jitter, RETRY_CONFIG.maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determine if an error should be retried
 * @param {RTTApiError} error - The error to check
 * @param {number} attempt - Current attempt number
 * @returns {boolean} True if should retry
 */
function shouldRetry(error, attempt) {
  // Don't retry if we've exhausted attempts
  if (attempt >= RETRY_CONFIG.maxRetries) {
    return false;
  }
  
  // Fast fail on authentication/authorization errors
  if (error.statusCode && RETRY_CONFIG.nonRetryableStatusCodes.includes(error.statusCode)) {
    log.debug(`Non-retryable status code ${error.statusCode}, failing immediately`);
    return false;
  }
  
  // Retry on rate limiting and server errors
  if (error.statusCode && RETRY_CONFIG.retryableStatusCodes.includes(error.statusCode)) {
    log.debug(`Retryable status code ${error.statusCode}, will retry`);
    return true;
  }
  
  // Retry on network errors (no status code)
  if (!error.statusCode) {
    log.debug('Network error, will retry');
    return true;
  }
  
  return false;
}

/**
 * Search RTT API for train services between two locations with retry logic.
 * Implements exponential backoff for retryable errors (429, 5xx, network errors).
 * Fast fails on authentication/authorization errors (401, 403).
 * 
 * @param {string} from - Origin TIPLOC code
 * @param {string} to - Destination TIPLOC code
 * @param {string} date - Date in YYYY/MM/DD format
 * @param {Object} [options] - Additional options
 * @param {string} [options.user] - RTT API username (defaults to config)
 * @param {string} [options.pass] - RTT API password (defaults to config)
 * @param {Function} [options.fetchImpl] - Custom fetch implementation for testing
 * @param {number} [options.maxRetries] - Override max retry attempts
 * @returns {Promise<RTTSearchResponse>} RTT API response with services array
 * @throws {RTTApiError} If from/to TIPLOCs are missing or API request fails after retries
 */
export async function rttSearch(from, to, date, { user, pass, fetchImpl, maxRetries } = {}) {
  if (!from || !to) {
    throw new RTTApiError('rttSearch requires both from and to TIPLOC', {
      context: { from, to, date }
    });
  }
  
  const RTT_USER = user || config.rtt.user;
  const RTT_PASS = pass || config.rtt.pass;
  const url = `https://api.rtt.io/api/v1/json/search/${from}/to/${to}/${date}`;
  const effectiveMaxRetries = maxRetries ?? RETRY_CONFIG.maxRetries;
  
  let lastError;
  
  for (let attempt = 0; attempt <= effectiveMaxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateBackoffDelay(attempt - 1);
        log.info(`Retry attempt ${attempt}/${effectiveMaxRetries} after ${Math.round(delay)}ms delay`);
        await sleep(delay);
      }
      
      log.debug(`GET ${url}${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}`);
      
      const res = await (fetchImpl || fetch)(url, { 
        headers: { Authorization: `Basic ${b64(RTT_USER, RTT_PASS)}` } 
      });
      
      log.debug(`Response: ${res.status}`);
      
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const error = new RTTApiError(`RTT API request failed: ${res.status} ${res.statusText}`, {
          statusCode: res.status,
          endpoint: url,
          responseBody: body,
          context: { from, to, date, attempt }
        });
        
        // Check if we should retry this error
        if (!shouldRetry(error, attempt)) {
          throw error;
        }
        
        lastError = error;
        continue; // Try next attempt
      }
      
      // Success! Return the response
      if (attempt > 0) {
        log.info(`Request succeeded after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}`);
      }
      return res.json();
      
    } catch (error) {
      // Re-throw RTTApiError if it's not retryable
      if (error instanceof RTTApiError) {
        if (!shouldRetry(error, attempt)) {
          throw error;
        }
        lastError = error;
        continue;
      }
      
      // Wrap network errors
      const networkError = new RTTApiError(`Network error calling RTT API: ${error.message}`, {
        endpoint: url,
        context: { from, to, date, attempt, originalError: error.message }
      });
      
      if (!shouldRetry(networkError, attempt)) {
        throw networkError;
      }
      
      lastError = networkError;
    }
  }
  
  // All retries exhausted
  log.error(`All ${effectiveMaxRetries} retry attempts exhausted`);
  throw lastError;
}
