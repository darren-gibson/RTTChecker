/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily blocking requests to failing services
 *
 * @see docs/VALIDATION_AND_RETRY.md for usage examples
 */

export const CircuitState = {
  CLOSED: 'CLOSED', // Normal operation
  OPEN: 'OPEN', // Failing - reject immediately
  HALF_OPEN: 'HALF_OPEN', // Testing recovery
} as const;

export type CircuitStateType = (typeof CircuitState)[keyof typeof CircuitState];

export interface StateChangeEvent {
  from: CircuitStateType;
  to: CircuitStateType;
  breaker: CircuitBreaker;
}

export interface FailureEvent {
  error: Error;
  breaker: CircuitBreaker;
}

export interface SuccessEvent {
  breaker: CircuitBreaker;
}

export interface CircuitBreakerConfig {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  onStateChange?: (event: StateChangeEvent) => void;
  onFailure?: (event: FailureEvent) => void;
  onSuccess?: (event: SuccessEvent) => void;
}

export interface CircuitBreakerError extends Error {
  circuitBreakerOpen?: boolean;
  nextAttemptTime?: number | null;
}

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
  readonly failureThreshold: number;
  readonly successThreshold: number;
  readonly timeout: number;
  private readonly onStateChange?: (event: StateChangeEvent) => void;
  private readonly onFailure?: (event: FailureEvent) => void;
  private readonly onSuccess?: (event: SuccessEvent) => void;

  private state: CircuitStateType;
  private failureCount: number;
  private successCount: number;
  private nextAttemptTime: number | null;
  private lastError: Error | null;

  constructor(config: CircuitBreakerConfig = {}) {
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
   */
  getState(): CircuitStateType {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Get success count (relevant in half-open state)
   */
  getSuccessCount(): number {
    return this.successCount;
  }

  /**
   * Get last error
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit should transition to half-open
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime !== null && Date.now() >= this.nextAttemptTime;
  }

  /**
   * Change circuit state
   */
  private changeState(newState: CircuitStateType): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.onStateChange?.({ from: oldState, to: newState, breaker: this });
    }
  }

  /**
   * Handle successful operation
   */
  private onOperationSuccess(): void {
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
   */
  private onOperationFailure(error: Error): void {
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
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if we should attempt reset
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
      this.changeState(CircuitState.HALF_OPEN);
      this.successCount = 0;
    }

    // Reject immediately if circuit is open
    if (this.state === CircuitState.OPEN) {
      const error: CircuitBreakerError = new Error(
        `Circuit breaker is OPEN. Last error: ${this.lastError?.message || 'Unknown'}. Next attempt at ${new Date(this.nextAttemptTime ?? 0).toISOString()}`
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
      this.onOperationFailure(error as Error);
      throw error;
    }
  }

  /**
   * Manually reset the circuit breaker
   * Useful for administrative control or testing
   */
  reset(): void {
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
  open(): void {
    this.changeState(CircuitState.OPEN);
    this.nextAttemptTime = Date.now() + this.timeout;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): Record<string, unknown> {
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
