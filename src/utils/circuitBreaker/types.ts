/**
 * Circuit Breaker Type Definitions
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
  breaker: unknown; // Will be CircuitBreaker, but avoiding circular reference
}

export interface FailureEvent {
  error: Error;
  breaker: unknown;
}

export interface SuccessEvent {
  breaker: unknown;
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

export interface CircuitBreakerStats {
  state: CircuitStateType;
  failureCount: number;
  successCount: number;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  nextAttemptTime: number | null;
  lastError: {
    message: string;
    name: string;
  } | null;
}
