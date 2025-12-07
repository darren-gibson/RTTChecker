import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import { CircuitBreaker, CircuitState } from '../../../src/utils/circuitBreaker.js';

describe('CircuitBreaker', () => {
  describe('initialization', () => {
    it('should initialize with default config', () => {
      const breaker = new CircuitBreaker();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getFailureCount()).toBe(0);
      expect(breaker.getSuccessCount()).toBe(0);
      expect(breaker.isOpen()).toBe(false);
    });

    it('should initialize with custom config', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 1,
        timeout: 30000,
      });

      const stats = breaker.getStats();
      expect(stats.failureThreshold).toBe(3);
      expect(stats.successThreshold).toBe(1);
      expect(stats.timeout).toBe(30000);
    });

    it('should accept callbacks in config', () => {
      const onStateChange = jest.fn();
      const onFailure = jest.fn();
      const onSuccess = jest.fn();

      const breaker = new CircuitBreaker({
        onStateChange,
        onFailure,
        onSuccess,
      });

      // Callbacks are stored but private - test through execution instead
      expect(breaker).toBeDefined();
    });
  });

  describe('CLOSED state behavior', () => {
    let breaker;

    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
      });
    });

    it('should execute operation successfully', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('should track failures without opening circuit', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('API error'));

      await expect(breaker.execute(operation)).rejects.toThrow('API error');
      expect(breaker.getFailureCount()).toBe(1);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      await expect(breaker.execute(operation)).rejects.toThrow('API error');
      expect(breaker.getFailureCount()).toBe(2);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should transition to OPEN after threshold failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('API error'));
      const onStateChange = jest.fn();
      breaker.onStateChange = onStateChange;

      // Fail 3 times to hit threshold
      await expect(breaker.execute(operation)).rejects.toThrow('API error');
      await expect(breaker.execute(operation)).rejects.toThrow('API error');
      await expect(breaker.execute(operation)).rejects.toThrow('API error');

      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.isOpen()).toBe(true);
      expect(breaker.getFailureCount()).toBe(3);
      expect(onStateChange).toHaveBeenCalledWith({
        from: CircuitState.CLOSED,
        to: CircuitState.OPEN,
        breaker,
      });
    });

    it('should call onSuccess callback on successful operation', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const onSuccess = jest.fn();
      breaker.onSuccess = onSuccess;

      await breaker.execute(operation);

      expect(onSuccess).toHaveBeenCalledWith({ breaker });
    });

    it('should call onFailure callback on failed operation', async () => {
      const error = new Error('API error');
      const operation = jest.fn().mockRejectedValue(error);
      const onFailure = jest.fn();
      breaker.onFailure = onFailure;

      await expect(breaker.execute(operation)).rejects.toThrow('API error');

      expect(onFailure).toHaveBeenCalledWith({ error, breaker });
    });

    it('should reset failure count on success', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('API error'));
      const successOp = jest.fn().mockResolvedValue('success');

      // Accumulate some failures
      await expect(breaker.execute(failOp)).rejects.toThrow();
      await expect(breaker.execute(failOp)).rejects.toThrow();
      expect(breaker.getFailureCount()).toBe(2);

      // Successful operation should reset failure count
      await breaker.execute(successOp);
      expect(breaker.getFailureCount()).toBe(0);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('OPEN state behavior', () => {
    let breaker;

    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
      });
    });

    it('should reject immediately when circuit is open', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('API error'));

      // Open the circuit
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Next call should fail immediately without calling operation
      const attemptOperation = jest.fn().mockResolvedValue('success');
      await expect(breaker.execute(attemptOperation)).rejects.toThrow(/Circuit breaker is OPEN/);
      expect(attemptOperation).not.toHaveBeenCalled();
    });

    it('should include last error message in circuit open error', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Connection timeout'));

      // Open the circuit
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();

      // Check error message includes last error
      try {
        await breaker.execute(operation);
      } catch (error) {
        expect(error.message).toContain('Connection timeout');
        expect(error.circuitBreakerOpen).toBe(true);
        expect(error.nextAttemptTime).toBeDefined();
      }
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('API error'));

      // Open the circuit
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for timeout (simulate with manual time advancement)
      breaker.nextAttemptTime = Date.now() - 100; // Set to past

      // Next execution should transition to half-open
      const successOp = jest.fn().mockResolvedValue('success');
      await breaker.execute(successOp);

      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
      expect(successOp).toHaveBeenCalled();
    });

    it('should store last error', async () => {
      const error = new Error('Specific error message');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();

      expect(breaker.getLastError()).toBe(error);
      expect(breaker.getLastError().message).toBe('Specific error message');
    });
  });

  describe('HALF_OPEN state behavior', () => {
    let breaker;

    beforeEach(async () => {
      breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 100,
      });

      // Open the circuit
      const failOp = jest.fn().mockRejectedValue(new Error('API error'));
      await expect(breaker.execute(failOp)).rejects.toThrow();
      await expect(breaker.execute(failOp)).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Transition to half-open
      breaker.nextAttemptTime = Date.now() - 1;
    });

    it('should track successes toward threshold', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      // First success
      await breaker.execute(operation);
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
      expect(breaker.getSuccessCount()).toBe(1);

      // Second success should close circuit
      await breaker.execute(operation);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getSuccessCount()).toBe(0);
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('should transition back to OPEN on failure', async () => {
      const successOp = jest.fn().mockResolvedValue('success');
      const failOp = jest.fn().mockRejectedValue(new Error('Still failing'));

      // One success
      await breaker.execute(successOp);
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
      expect(breaker.getSuccessCount()).toBe(1);

      // Failure should immediately reopen circuit
      await expect(breaker.execute(failOp)).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.getSuccessCount()).toBe(0);
    });

    it('should call onStateChange when transitioning to CLOSED', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const onStateChange = jest.fn();
      breaker.onStateChange = onStateChange;

      // Reach success threshold
      await breaker.execute(operation);
      await breaker.execute(operation);

      expect(onStateChange).toHaveBeenCalledWith({
        from: CircuitState.HALF_OPEN,
        to: CircuitState.CLOSED,
        breaker,
      });
    });

    it('should reset success count when transitioning to CLOSED', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await breaker.execute(operation);
      await breaker.execute(operation);

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getSuccessCount()).toBe(0);
    });
  });

  describe('manual control methods', () => {
    let breaker;

    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 1000,
      });
    });

    it('should manually reset circuit breaker', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('API error'));

      // Open the circuit
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.getFailureCount()).toBe(2);

      // Manual reset
      breaker.reset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getFailureCount()).toBe(0);
      expect(breaker.getSuccessCount()).toBe(0);
      expect(breaker.getLastError()).toBeNull();
    });

    it('should manually open circuit breaker', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      breaker.open();

      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.nextAttemptTime).toBeGreaterThan(Date.now());
    });

    it('should not call onStateChange if state unchanged', () => {
      const onStateChange = jest.fn();
      breaker.onStateChange = onStateChange;

      breaker.reset(); // Already CLOSED

      expect(onStateChange).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return comprehensive statistics', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 5000,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Test error'));
      await expect(breaker.execute(operation)).rejects.toThrow();

      const stats = breaker.getStats();

      expect(stats).toEqual({
        state: CircuitState.CLOSED,
        failureCount: 1,
        successCount: 0,
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 5000,
        nextAttemptTime: null,
        lastError: {
          message: 'Test error',
          name: 'Error',
        },
      });
    });

    it('should return null for lastError when no errors occurred', () => {
      const breaker = new CircuitBreaker();
      const stats = breaker.getStats();

      expect(stats.lastError).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle synchronous errors in operation', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const operation = jest.fn(() => {
        throw new Error('Sync error');
      });

      await expect(breaker.execute(operation)).rejects.toThrow('Sync error');
      expect(breaker.getFailureCount()).toBe(1);
    });

    it('should handle operation returning non-promise', async () => {
      const breaker = new CircuitBreaker();
      const operation = jest.fn().mockReturnValue('immediate value');

      const result = await breaker.execute(operation);

      expect(result).toBe('immediate value');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should handle multiple rapid failures', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 5 });
      const operation = jest.fn().mockRejectedValue(new Error('Rapid fail'));

      const promises = Array.from({ length: 10 }, () => breaker.execute(operation).catch((e) => e));

      await Promise.all(promises);

      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.getFailureCount()).toBeGreaterThanOrEqual(5);
    });

    it('should handle zero thresholds gracefully', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 0,
        successThreshold: 0,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Error'));

      // With threshold 0, never opens (always < 0 failures)
      await expect(breaker.execute(operation)).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getFailureCount()).toBe(1);
    });
  });

  describe('CircuitState enum', () => {
    it('should export all states', () => {
      expect(CircuitState.CLOSED).toBe('CLOSED');
      expect(CircuitState.OPEN).toBe('OPEN');
      expect(CircuitState.HALF_OPEN).toBe('HALF_OPEN');
    });
  });
});
