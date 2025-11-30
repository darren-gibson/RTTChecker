/**
 * @typedef {import('../types.js').RTTSearchResponse} RTTSearchResponse
 */

import { config } from "../config.js";
import { loggers } from "../utils/logger.js";
import { fetchJsonWithRetry } from "../utils/retryableRequest.js";

import { RTTApiError } from "./errors.js";

const log = loggers.bridge;

/**
 * Encode credentials for HTTP Basic Authentication.
 * @param {string} u - Username
 * @param {string} p - Password
 * @returns {string} Base64-encoded credentials
 */
export const encodeBasicAuth = (u, p) => Buffer.from(`${u}:${p}`).toString("base64");

// Use withRetry's internal defaults; caller can override via maxRetries.

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
  
  try {
    return await fetchJsonWithRetry(
      url,
      {
        fetchImpl: fetchImpl || fetch,
        headers: { Authorization: `Basic ${encodeBasicAuth(RTT_USER, RTT_PASS)}` }
      },
      {
        ...(typeof maxRetries === 'number' ? { maxRetries } : {}),
        logger: log,
        buildError: (res, body, attempt) => new RTTApiError(`RTT API request failed: ${res.status} ${res.statusText}`, {
          statusCode: res.status,
          endpoint: url,
          responseBody: body,
          context: { from, to, date, attempt }
        })
      }
    );
  } catch (error) {
    // Ensure we always throw an RTTApiError
    if (error instanceof RTTApiError) {
      throw error;
    }
    throw new RTTApiError(`Network error calling RTT API: ${error.message}`, {
      endpoint: url,
      context: { from, to, date, originalError: error.message }
    });
  }
}
