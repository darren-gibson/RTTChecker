import { config } from '../config.js';
import { loggers } from '../utils/logger.js';
import { createResilientClient } from '../utils/resilientRequest.js';
import type { CircuitBreaker } from '../utils/circuitBreaker.js';

import { RTTApiError } from './errors.js';

// Type definitions for RTT API
export interface RTTService {
  serviceUid: string;
  runDate: string;
  trainIdentity: string;
  serviceType: string;
  origin?: { tiploc: string; description?: string };
  destination?: { tiploc: string; description?: string };
  locationDetail?: {
    realtimeActivated?: boolean;
    realtimeDeparture?: string;
    gbttBookedDeparture?: string;
    origin?: Array<{ tiploc: string; description?: string }>;
    destination?: Array<{ tiploc: string; description?: string }>;
    displayAs?: string;
    platform?: string;
    platformConfirmed?: boolean;
    platformChanged?: boolean;
  };
}

export interface RTTSearchResponse {
  location?: { name: string; crs: string; tiploc: string };
  filter?: { from: string; to: string };
  services?: RTTService[];
}

export interface RTTSearchOptions {
  user?: string;
  pass?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
}

const log = loggers.bridge;

// Create singleton resilient client with circuit breaker for RTT API
const rttClient = createResilientClient('RTT_API', {
  failureThreshold: 5, // Open circuit after 5 consecutive failures
  successThreshold: 2, // Close circuit after 2 consecutive successes
  timeout: 60000, // Wait 60s before trying half-open
  maxRetries: 3, // Retry each request up to 3 times
  baseDelayMs: 1000, // Start with 1s delay
  maxDelayMs: 10000, // Cap at 10s delay
  logger: log,
  onCircuitOpen: (breaker: CircuitBreaker) => {
    log.error(
      `RTT API circuit opened after ${breaker.getFailureCount()} failures - service degraded`
    );
  },
  onCircuitClose: () => {
    log.info('RTT API circuit closed - service recovered');
  },
});

/**
 * Encode credentials for HTTP Basic Authentication.
 * @param u - Username
 * @param p - Password
 * @returns Base64-encoded credentials
 */
export const encodeBasicAuth = (u: string, p: string): string =>
  Buffer.from(`${u}:${p}`).toString('base64');

// Use withRetry's internal defaults; caller can override via maxRetries.

/**
 * Search RTT API for train services between two locations with retry logic.
 * Implements exponential backoff for retryable errors (429, 5xx, network errors).
 * Fast fails on authentication/authorization errors (401, 403).
 *
 * @param from - Origin TIPLOC code
 * @param to - Destination TIPLOC code
 * @param date - Date in YYYY/MM/DD format
 * @param options - Additional options
 * @returns RTT API response with services array
 * @throws RTTApiError If from/to TIPLOCs are missing or API request fails after retries
 */
export async function rttSearch(
  from: string,
  to: string,
  date: string,
  options: RTTSearchOptions = {}
): Promise<RTTSearchResponse> {
  const { user, pass, fetchImpl, maxRetries } = options;
  if (!from || !to) {
    throw new RTTApiError('rttSearch requires both from and to TIPLOC', {
      context: { from, to, date },
    });
  }

  const RTT_USER = user || config.rtt.user;
  const RTT_PASS = pass || config.rtt.pass;

  if (!RTT_USER || !RTT_PASS) {
    throw new RTTApiError('RTT API credentials not configured', {
      context: { from, to, date },
    });
  }

  const url = `https://api.rtt.io/api/v1/json/search/${from}/to/${to}/${date}`;

  try {
    return (await rttClient.fetchJson(
      url,
      {
        fetchImpl: fetchImpl || fetch,
        headers: { Authorization: `Basic ${encodeBasicAuth(RTT_USER, RTT_PASS)}` },
      },
      {
        // Allow per-request override of retry config
        ...(typeof maxRetries === 'number' ? { maxRetries } : {}),
        buildError: (res: Response, body: unknown, attempt: number) =>
          new RTTApiError(`RTT API request failed: ${res.status} ${res.statusText}`, {
            statusCode: res.status,
            endpoint: url,
            responseBody: body,
            context: { from, to, date, attempt },
          }),
      }
    )) as RTTSearchResponse;
  } catch (error) {
    // Handle circuit breaker open errors gracefully
    if (error && typeof error === 'object' && 'circuitBreakerOpen' in error) {
      throw new RTTApiError('RTT API temporarily unavailable (circuit breaker open)', {
        statusCode: 503,
        endpoint: url,
        context: { from, to, date, circuitOpen: true },
      });
    }
    // Ensure we always throw an RTTApiError
    if (error instanceof RTTApiError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new RTTApiError(`Network error calling RTT API: ${errorMessage}`, {
      endpoint: url,
      context: { from, to, date, originalError: errorMessage },
    });
  }
}

export interface RTTApiHealth {
  state: string;
  failureCount: number;
  successCount: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  isHealthy: boolean;
}

/**
 * Get RTT API circuit breaker health statistics.
 * Useful for monitoring, health checks, and diagnostics.
 *
 * @returns Circuit breaker statistics including state, failure count, etc.
 * @example
 * const health = getRTTApiHealth();
 * console.log(`RTT API Status: ${health.state}, Failures: ${health.failureCount}`);
 */
export function getRTTApiHealth(): RTTApiHealth {
  return {
    ...rttClient.getStats(),
    isHealthy: !rttClient.isCircuitOpen(),
  };
}

/**
 * Manually reset the RTT API circuit breaker.
 * Use this for administrative control after fixing underlying issues.
 *
 * @example
 * // After fixing RTT API credentials or service issues
 * resetRTTApiCircuit();
 */
export function resetRTTApiCircuit(): void {
  log.info('Manually resetting RTT API circuit breaker');
  rttClient.resetCircuit();
}
