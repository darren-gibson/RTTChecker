import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  ResilientRequest,
  createResilientClient,
  clearResilientClients,
} from '../../../src/utils/resilientRequest.js';
import { CircuitState } from '../../../src/utils/circuitBreaker.js';

describe('ResilientRequest', () => {
  describe('initialization', () => {
    it('should initialize with default config', () => {
      const resilient = new ResilientRequest();

      expect(resilient.getCircuitState()).toBe(CircuitState.CLOSED);
      expect(resilient.isCircuitOpen()).toBe(false);
      expect(resilient.retryConfig.maxRetries).toBe(3);
    });

    it('should initialize with custom config', () => {
      const resilient = new ResilientRequest({
        failureThreshold: 10,
        successThreshold: 3,
        timeout: 120000,
        maxRetries: 5,
        baseDelayMs: 2000,
        maxDelayMs: 20000,
      });

      const stats = resilient.getStats();
      expect(stats.failureThreshold).toBe(10);
      expect(stats.successThreshold).toBe(3);
      expect(stats.timeout).toBe(120000);
      expect(resilient.retryConfig.maxRetries).toBe(5);
      expect(resilient.retryConfig.baseDelayMs).toBe(2000);
    });

    it('should accept logger in config', () => {
      const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      };

      const resilient = new ResilientRequest({ logger });

      expect(resilient.logger).toBe(logger);
      expect(resilient.retryConfig.logger).toBe(logger);
    });
  });

  describe('execute with retry and circuit breaker', () => {
    let resilient;

    beforeEach(() => {
      resilient = new ResilientRequest({
        failureThreshold: 3,
        maxRetries: 2,
        baseDelayMs: 10, // Fast for testing
      });
    });

    it('should execute operation successfully', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await resilient.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(resilient.getCircuitState()).toBe(CircuitState.CLOSED);
    });

    it('should retry on failure before circuit opens', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue('success');

      const result = await resilient.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2); // Original + 1 retry
      expect(resilient.getCircuitState()).toBe(CircuitState.CLOSED);
    });

    it('should open circuit after threshold failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent error'));

      // Execute 3 times to hit failure threshold
      await expect(resilient.execute(operation)).rejects.toThrow('Persistent error');
      await expect(resilient.execute(operation)).rejects.toThrow('Persistent error');
      await expect(resilient.execute(operation)).rejects.toThrow('Persistent error');

      expect(resilient.getCircuitState()).toBe(CircuitState.OPEN);
      expect(resilient.isCircuitOpen()).toBe(true);
    });

    it('should fail fast when circuit is open', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Error'));

      // Open the circuit
      await expect(resilient.execute(operation)).rejects.toThrow();
      await expect(resilient.execute(operation)).rejects.toThrow();
      await expect(resilient.execute(operation)).rejects.toThrow();
      expect(resilient.isCircuitOpen()).toBe(true);

      // Next call should fail immediately without retry
      const callCount = operation.mock.calls.length;
      await expect(resilient.execute(operation)).rejects.toThrow(/Circuit breaker is OPEN/);
      expect(operation).toHaveBeenCalledTimes(callCount); // No new calls
    });

    it('should count retries within single execute as one circuit attempt', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Error'));

      // One execute with 2 retries = 1 circuit failure
      await expect(resilient.execute(operation)).rejects.toThrow('Error');

      const stats = resilient.getStats();
      expect(stats.failureCount).toBe(1);
      expect(operation).toHaveBeenCalledTimes(3); // Original + 2 retries
    });
  });

  describe('fetchJson integration', () => {
    let resilient;
    let mockFetch;

    beforeEach(() => {
      mockFetch = jest.fn();
      resilient = new ResilientRequest({
        failureThreshold: 2,
        maxRetries: 1,
        baseDelayMs: 10,
      });
    });

    it('should fetch JSON successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      const result = await resilient.fetchJson('https://api.test.com/data', {
        fetchImpl: mockFetch,
      });

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledWith('https://api.test.com/data', expect.any(Object));
    });

    it('should retry on server error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: async () => 'Unavailable',
        })
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: 'recovered' }),
        });

      const result = await resilient.fetchJson('https://api.test.com/data', {
        fetchImpl: mockFetch,
      });

      expect(result).toEqual({ data: 'recovered' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should open circuit after persistent failures', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Error',
      });

      // Hit failure threshold
      await expect(
        resilient.fetchJson('https://api.test.com/data', { fetchImpl: mockFetch })
      ).rejects.toThrow();
      await expect(
        resilient.fetchJson('https://api.test.com/data', { fetchImpl: mockFetch })
      ).rejects.toThrow();

      expect(resilient.isCircuitOpen()).toBe(true);

      // Circuit open should fail fast
      const callCount = mockFetch.mock.calls.length;
      await expect(
        resilient.fetchJson('https://api.test.com/data', { fetchImpl: mockFetch })
      ).rejects.toThrow(/Circuit breaker is OPEN/);
      expect(mockFetch).toHaveBeenCalledTimes(callCount); // No new calls
    });

    it('should pass custom headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await resilient.fetchJson('https://api.test.com/data', {
        fetchImpl: mockFetch,
        headers: { 'X-Custom': 'value' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/data',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Custom': 'value' }),
        })
      );
    });
  });

  describe('circuit state callbacks', () => {
    it('should call onCircuitOpen callback', async () => {
      const onCircuitOpen = jest.fn();
      const resilient = new ResilientRequest({
        failureThreshold: 2,
        baseDelayMs: 10,
        onCircuitOpen,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Error'));

      await expect(resilient.execute(operation)).rejects.toThrow();
      await expect(resilient.execute(operation)).rejects.toThrow();

      expect(onCircuitOpen).toHaveBeenCalledWith(
        expect.objectContaining({
          getState: expect.any(Function),
        })
      );
    });

    it('should call onCircuitClose callback', async () => {
      const onCircuitClose = jest.fn();
      const resilient = new ResilientRequest({
        failureThreshold: 2,
        successThreshold: 1,
        baseDelayMs: 10,
        onCircuitClose,
      });

      const failOp = jest.fn().mockRejectedValue(new Error('Error'));
      const successOp = jest.fn().mockResolvedValue('success');

      // Open circuit
      await expect(resilient.execute(failOp)).rejects.toThrow();
      await expect(resilient.execute(failOp)).rejects.toThrow();
      expect(resilient.isCircuitOpen()).toBe(true);

      // Transition to half-open
      resilient.circuitBreaker.nextAttemptTime = Date.now() - 1;

      // Close circuit with success
      await resilient.execute(successOp);

      expect(onCircuitClose).toHaveBeenCalledWith(
        expect.objectContaining({
          getState: expect.any(Function),
        })
      );
    });

    it('should log state changes with logger', async () => {
      const logger = {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      };

      const resilient = new ResilientRequest({
        failureThreshold: 2,
        baseDelayMs: 10,
        logger,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Error'));

      await expect(resilient.execute(operation)).rejects.toThrow();
      await expect(resilient.execute(operation)).rejects.toThrow();

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Circuit breaker state'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Circuit OPENED'));
    });
  });

  describe('manual control', () => {
    let resilient;

    beforeEach(() => {
      resilient = new ResilientRequest({
        failureThreshold: 2,
        baseDelayMs: 10,
      });
    });

    it('should manually reset circuit', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Error'));

      // Open circuit
      await expect(resilient.execute(operation)).rejects.toThrow();
      await expect(resilient.execute(operation)).rejects.toThrow();
      expect(resilient.isCircuitOpen()).toBe(true);

      // Manual reset
      resilient.resetCircuit();

      expect(resilient.getCircuitState()).toBe(CircuitState.CLOSED);
      expect(resilient.isCircuitOpen()).toBe(false);
    });

    it('should manually open circuit', () => {
      expect(resilient.isCircuitOpen()).toBe(false);

      resilient.openCircuit();

      expect(resilient.isCircuitOpen()).toBe(true);
      expect(resilient.getCircuitState()).toBe(CircuitState.OPEN);
    });
  });

  describe('getStats', () => {
    it('should return circuit breaker stats', async () => {
      const resilient = new ResilientRequest({
        failureThreshold: 5,
        successThreshold: 2,
        baseDelayMs: 10,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Error'));
      await expect(resilient.execute(operation)).rejects.toThrow();

      const stats = resilient.getStats();

      expect(stats).toMatchObject({
        state: CircuitState.CLOSED,
        failureCount: 1,
        successCount: 0,
        failureThreshold: 5,
        successThreshold: 2,
      });
    });
  });

  describe('createResilientClient singleton factory', () => {
    beforeEach(() => {
      clearResilientClients();
    });

    it('should create singleton instance per service name', () => {
      const client1 = createResilientClient('SERVICE_A');
      const client2 = createResilientClient('SERVICE_A');
      const client3 = createResilientClient('SERVICE_B');

      expect(client1).toBe(client2); // Same service name = same instance
      expect(client1).not.toBe(client3); // Different service = different instance
    });

    it('should share circuit state across calls', async () => {
      const client = createResilientClient('SHARED_SERVICE', {
        failureThreshold: 2,
        baseDelayMs: 10,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Error'));

      // First failure
      await expect(client.execute(operation)).rejects.toThrow();
      expect(client.getStats().failureCount).toBe(1);

      // Get the same instance and check state is shared
      const sameClient = createResilientClient('SHARED_SERVICE');
      expect(sameClient.getStats().failureCount).toBe(1);

      // Second failure opens circuit
      await expect(sameClient.execute(operation)).rejects.toThrow();
      expect(sameClient.isCircuitOpen()).toBe(true);
    });

    it('should clear all instances', () => {
      const client1 = createResilientClient('SERVICE_A');
      const client2 = createResilientClient('SERVICE_B');

      expect(client1).toBeDefined();
      expect(client2).toBeDefined();

      clearResilientClients();

      // Should create new instances after clear
      const newClient1 = createResilientClient('SERVICE_A');
      expect(newClient1).not.toBe(client1);
    });
  });

  describe('override retry options per call', () => {
    it('should allow overriding retry config for single execute', async () => {
      const resilient = new ResilientRequest({
        maxRetries: 1,
        baseDelayMs: 10,
      });

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      // Override to allow more retries
      const result = await resilient.execute(operation, { maxRetries: 2 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3); // Original + 2 retries
    });
  });
});
