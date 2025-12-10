/**
 * Resilient request wrapper combining Circuit Breaker and Retry patterns
 * Provides comprehensive fault tolerance for external service calls
 *
 * @see src/utils/circuitBreaker.js for circuit breaker implementation
 * @see src/utils/retryableRequest.js for retry logic
 */

import { CircuitBreaker, CircuitState, type CircuitBreakerStats } from './circuitBreaker.js';
import {
  withRetry,
  fetchJsonWithRetry,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
  type Logger,
  type RetryOptions,
  type FetchOptions,
  type FetchRetryOptions,
} from './retryableRequest.js';

export interface ResilientConfig {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatusCodes?: number[];
  nonRetryableStatusCodes?: number[];
  logger?: Logger;
  onCircuitOpen?: (breaker: CircuitBreaker) => void;
  onCircuitClose?: (breaker: CircuitBreaker) => void;
}

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
  private readonly logger?: Logger;
  private readonly retryConfig: RetryConfig & { logger?: Logger };
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: ResilientConfig = {}) {
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
        const cb = breaker as CircuitBreaker;
        this.logger?.info?.(`Circuit breaker state: ${from} → ${to}`);
        if (to === CircuitState.OPEN) {
          this.logger?.error?.(`Circuit OPENED after ${cb.getFailureCount()} failures`);
          config.onCircuitOpen?.(cb);
        } else if (to === CircuitState.CLOSED) {
          this.logger?.info?.('Circuit CLOSED - service recovered');
          config.onCircuitClose?.(cb);
        }
      },
      onFailure: ({ error, breaker }) => {
        const cb = breaker as CircuitBreaker;
        this.logger?.debug?.(
          `Operation failed (${cb.getFailureCount()}/${cb.failureThreshold}): ${error.message}`
        );
      },
      onSuccess: () => {
        this.logger?.debug?.('Operation succeeded');
      },
    });
  }

  /**
   * Execute an operation with circuit breaker and retry protection
   */
  async execute<T>(
    operation: (attempt: number) => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    // Circuit breaker wraps the retry logic
    return this.circuitBreaker.execute(async () => {
      const retryOptions = { ...this.retryConfig, ...options };
      return withRetry(operation, retryOptions);
    });
  }

  /**
   * Fetch JSON with full protection (circuit breaker + retry + parsing)
   */
  async fetchJson<T>(
    url: string,
    fetchOptions: FetchOptions = {},
    retryOptions: FetchRetryOptions = {}
  ): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      const mergedOptions = { ...this.retryConfig, ...retryOptions };
      return fetchJsonWithRetry(url, fetchOptions, mergedOptions);
    });
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return this.circuitBreaker.getStats();
  }

  /**
   * Get current circuit state
   */
  getCircuitState(): string {
    return this.circuitBreaker.getState();
  }

  /**
   * Check if circuit is open
   */
  isCircuitOpen(): boolean {
    return this.circuitBreaker.isOpen();
  }

  /**
   * Manually reset the circuit breaker
   * Useful for administrative control after fixing underlying issues
   */
  resetCircuit(): void {
    this.logger?.info?.('Manually resetting circuit breaker');
    this.circuitBreaker.reset();
  }

  /**
   * Manually open the circuit breaker
   * Useful for maintenance mode or manual intervention
   */
  openCircuit(): void {
    this.logger?.warn?.('Manually opening circuit breaker');
    this.circuitBreaker.open();
  }
}

/**
 * Create a singleton resilient request instance with shared circuit breaker
 * Useful for managing a single service's health across multiple call sites
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
const instances = new Map<string, ResilientRequest>();

export function createResilientClient(
  serviceName: string,
  config: ResilientConfig = {}
): ResilientRequest {
  if (!instances.has(serviceName)) {
    instances.set(serviceName, new ResilientRequest(config));
  }
  return instances.get(serviceName)!;
}

/**
 * Clear all singleton instances (useful for testing)
 */
export function clearResilientClients(): void {
  instances.clear();
}
