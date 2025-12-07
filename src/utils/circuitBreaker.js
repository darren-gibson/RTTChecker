/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily blocking requests to failing services
 * 
 * @see docs/VALIDATION_AND_RETRY.md for usage examples
 */

/**
 * Circuit breaker states
 * @enum {string}
 */
export const CircuitState = {
  CLOSED: 'CLOSED', // Normal operation
  OPEN: 'OPEN', // Failing - reject immediately
  HALF_OPEN: 'HALF_OPEN', // Testing recovery
};

/**
 * @typedef {Object} CircuitBreakerConfig
 * @property {number} failureThreshold - Number of failures before opening circuit
 * @property {number} successThreshold - Number of successes in half-open to close circuit
 * @property {number} timeout - Time in ms before attempting recovery (half-open)
 * @property {Function} [onStateChange] - Callback when circuit state changes
 * @property {Function} [onFailure] - Callback when operation fails
 * @property {Function} [onSuccess] - Callback when operation succeeds
 */

/**
 * Circuit Breaker for protecting against cascading failures
 * 
 * @example
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 5,
 *   successThreshold: 2,
 *   timeout: 60000,
 * });
 * 
 * const result = await breaker.execute(async () => {
 *   return await apiCall();
 * });
 */
export class CircuitBreaker {
  /**
   * @param {CircuitBreakerConfig} config - Circuit breaker configuration
   */
  constructor(config = {}) {
    this.failureThreshold = config.failureThreshold || 5;
    this.successThreshold = config.successThreshold || 2;
    this.timeout = config.timeout || 60000; // 1 minute default
    this.onStateChange = config.onStateChange;
    this.onFailure = config.onFailure;
    this.onSuccess = config.onSuccess;

    // Internal state
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = null;
    this.lastError = null;
  }

  /**
   * Get current circuit state
   * @returns {string} Current circuit state
   */
  getState() {
    return this.state;
  }

  /**
   * Get failure count
   * @returns {number} Current failure count
   */
  getFailureCount() {
    return this.failureCount;
  }

  /**
   * Get success count (relevant in half-open state)
   * @returns {number} Current success count
   */
  getSuccessCount() {
    return this.successCount;
  }

  /**
   * Get last error
   * @returns {Error|null} Last error that occurred
   */
  getLastError() {
    return this.lastError;
  }

  /**
   * Check if circuit is open
   * @returns {boolean} True if circuit is open
   */
  isOpen() {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit should transition to half-open
   * @private
   * @returns {boolean} True if timeout has elapsed
   */
  shouldAttemptReset() {
    return this.nextAttemptTime && Date.now() >= this.nextAttemptTime;
  }

  /**
   * Change circuit state
   * @private
   * @param {string} newState - New state to transition to
   */
  changeState(newState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.onStateChange?.({ from: oldState, to: newState, breaker: this });
    }
  }

  /**
   * Handle successful operation
   * @private
   */
  onOperationSuccess() {
    this.failureCount = 0;
    this.lastError = null;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.successCount = 0;
        this.changeState(CircuitState.CLOSED);
      }
    }

    this.onSuccess?.({ breaker: this });
  }

  /**
   * Handle failed operation
   * @private
   * @param {Error} error - Error that occurred
   */
  onOperationFailure(error) {
    this.failureCount++;
    this.lastError = error;

    if (this.state === CircuitState.HALF_OPEN) {
      // Fail immediately back to open on any failure in half-open
      this.successCount = 0;
      this.changeState(CircuitState.OPEN);
      this.nextAttemptTime = Date.now() + this.timeout;
    } else if (this.failureCount >= this.failureThreshold) {
      // Transition to open if threshold exceeded
      this.changeState(CircuitState.OPEN);
      this.nextAttemptTime = Date.now() + this.timeout;
    }

    this.onFailure?.({ error, breaker: this });
  }

  /**
   * Execute an operation through the circuit breaker
   * @template T
   * @param {Function} operation - Async function to execute
   * @returns {Promise<T>} Result of the operation
   * @throws {Error} Circuit open error or operation error
   */
  async execute(operation) {
    // Check if we should attempt reset
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
      this.changeState(CircuitState.HALF_OPEN);
      this.successCount = 0;
    }

    // Reject immediately if circuit is open
    if (this.state === CircuitState.OPEN) {
      const error = new Error(
        `Circuit breaker is OPEN. Last error: ${this.lastError?.message || 'Unknown'}. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`
      );
      error.circuitBreakerOpen = true;
      error.nextAttemptTime = this.nextAttemptTime;
      throw error;
    }

    // Execute operation
    try {
      const result = await operation();
      this.onOperationSuccess();
      return result;
    } catch (error) {
      this.onOperationFailure(error);
      throw error;
    }
  }

  /**
   * Manually reset the circuit breaker
   * Useful for administrative control or testing
   */
  reset() {
    this.changeState(CircuitState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = null;
    this.lastError = null;
  }

  /**
   * Manually open the circuit breaker
   * Useful for maintenance or manual intervention
   */
  open() {
    this.changeState(CircuitState.OPEN);
    this.nextAttemptTime = Date.now() + this.timeout;
  }

  /**
   * Get circuit breaker statistics
   * @returns {Object} Current statistics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureThreshold: this.failureThreshold,
      successThreshold: this.successThreshold,
      timeout: this.timeout,
      nextAttemptTime: this.nextAttemptTime,
      lastError: this.lastError
        ? {
            message: this.lastError.message,
            name: this.lastError.name,
          }
        : null,
    };
  }
}
