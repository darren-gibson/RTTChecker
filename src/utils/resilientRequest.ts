/**
 * Resilient request wrapper combining Circuit Breaker and Retry patterns
 * Provides comprehensive fault tolerance for external service calls
 *
 * @see src/utils/circuitBreaker.js for circuit breaker implementation
 * @see src/utils/retryableRequest.js for retry logic
 */

import { CircuitBreaker, CircuitState } from './circuitBreaker.js';
import { withRetry, fetchJsonWithRetry, DEFAULT_RETRY_CONFIG } from './retryableRequest.js';

/**
 * @typedef {Object} ResilientConfig
 * @property {number} [failureThreshold=5] - Failures before opening circuit
 * @property {number} [successThreshold=2] - Successes to close circuit
 * @property {number} [timeout=60000] - Circuit open timeout in ms
 * @property {number} [maxRetries=3] - Max retry attempts per request
 * @property {number} [baseDelayMs=1000] - Base retry delay
 * @property {number} [maxDelayMs=10000] - Max retry delay
 * @property {Function} [logger] - Logger instance with debug/info/error methods
 * @property {Function} [onCircuitOpen] - Callback when circuit opens
 * @property {Function} [onCircuitClose] - Callback when circuit closes
 */

/**
 * Resilient request handler with circuit breaker and retry logic
 *
 * @example
 * const resilient = new ResilientRequest({
 *   failureThreshold: 5,
 *   timeout: 60000,
 *   logger: myLogger,
 * });
 *
 * // Execute with full protection
 * const data = await resilient.execute(async () => {
 *   return await fetchData();
 * });
 *
 * // HTTP JSON request with built-in retry
 * const result = await resilient.fetchJson('https://api.example.com/data');
 */
export class ResilientRequest {
  /**
   * @param {ResilientConfig} config - Configuration options
   */
  constructor(config = {}) {
    this.logger = config.logger;
    this.retryConfig = {
      maxRetries: config.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries,
      baseDelayMs: config.baseDelayMs ?? DEFAULT_RETRY_CONFIG.baseDelayMs,
      maxDelayMs: config.maxDelayMs ?? DEFAULT_RETRY_CONFIG.maxDelayMs,
      retryableStatusCodes:
        config.retryableStatusCodes ?? DEFAULT_RETRY_CONFIG.retryableStatusCodes,
      nonRetryableStatusCodes:
        config.nonRetryableStatusCodes ?? DEFAULT_RETRY_CONFIG.nonRetryableStatusCodes,
      logger: this.logger,
    };

    // Create circuit breaker with state change callbacks
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 60000,
      onStateChange: ({ from, to, breaker }) => {
        this.logger?.info?.(`Circuit breaker state: ${from} → ${to}`);
        if (to === CircuitState.OPEN) {
          this.logger?.error?.(`Circuit OPENED after ${breaker.getFailureCount()} failures`);
          config.onCircuitOpen?.(breaker);
        } else if (to === CircuitState.CLOSED) {
          this.logger?.info?.('Circuit CLOSED - service recovered');
          config.onCircuitClose?.(breaker);
        }
      },
      onFailure: ({ error, breaker }) => {
        this.logger?.debug?.(
          `Operation failed (${breaker.getFailureCount()}/${breaker.failureThreshold}): ${error.message}`
        );
      },
      onSuccess: () => {
        this.logger?.debug?.('Operation succeeded');
      },
    });
  }

  /**
   * Execute an operation with circuit breaker and retry protection
   * @template T
   * @param {Function} operation - Async function to execute
   * @param {Object} [options] - Override retry options for this call
   * @returns {Promise<T>} Result of the operation
   * @throws {Error} Circuit open error or final operation error
   */
  async execute(operation, options = {}) {
    // Circuit breaker wraps the retry logic
    return this.circuitBreaker.execute(async () => {
      const retryOptions = { ...this.retryConfig, ...options };
      return withRetry(operation, retryOptions);
    });
  }

  /**
   * Fetch JSON with full protection (circuit breaker + retry + parsing)
   * @template T
   * @param {string} url - URL to fetch
   * @param {Object} [fetchOptions] - Fetch options (fetchImpl, init, headers)
   * @param {Object} [retryOptions] - Override retry options
   * @returns {Promise<T>} Parsed JSON response
   */
  async fetchJson(url, fetchOptions = {}, retryOptions = {}) {
    return this.circuitBreaker.execute(async () => {
      const mergedOptions = { ...this.retryConfig, ...retryOptions };
      return fetchJsonWithRetry(url, fetchOptions, mergedOptions);
    });
  }

  /**
   * Get circuit breaker statistics
   * @returns {Object} Current circuit breaker stats
   */
  getStats() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Get current circuit state
   * @returns {string} Current circuit state (CLOSED, OPEN, HALF_OPEN)
   */
  getCircuitState() {
    return this.circuitBreaker.getState();
  }

  /**
   * Check if circuit is open
   * @returns {boolean} True if circuit is open
   */
  isCircuitOpen() {
    return this.circuitBreaker.isOpen();
  }

  /**
   * Manually reset the circuit breaker
   * Useful for administrative control after fixing underlying issues
   */
  resetCircuit() {
    this.logger?.info?.('Manually resetting circuit breaker');
    this.circuitBreaker.reset();
  }

  /**
   * Manually open the circuit breaker
   * Useful for maintenance mode or manual intervention
   */
  openCircuit() {
    this.logger?.warn?.('Manually opening circuit breaker');
    this.circuitBreaker.open();
  }
}

/**
 * Create a singleton resilient request instance with shared circuit breaker
 * Useful for managing a single service's health across multiple call sites
 *
 * @param {string} serviceName - Unique name for this service
 * @param {ResilientConfig} config - Configuration options
 * @returns {ResilientRequest} Singleton instance
 *
 * @example
 * // In RTTBridge.js
 * const rttClient = createResilientClient('RTT_API', {
 *   failureThreshold: 5,
 *   timeout: 60000,
 *   logger: myLogger,
 * });
 *
 * // Multiple calls share the same circuit breaker
 * const search = await rttClient.fetchJson('https://api/search');
 * const service = await rttClient.fetchJson('https://api/service/123');
 */
const instances = new Map();

export function createResilientClient(serviceName, config = {}) {
  if (!instances.has(serviceName)) {
    instances.set(serviceName, new ResilientRequest(config));
  }
  return instances.get(serviceName);
}

/**
 * Clear all singleton instances (useful for testing)
 */
export function clearResilientClients() {
  instances.clear();
}
