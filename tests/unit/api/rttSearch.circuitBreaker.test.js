import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import { rttSearch, getRTTApiHealth, resetRTTApiCircuit } from '../../../src/api/rttApiClient.js';
import { RTTApiError } from '../../../src/api/errors.js';

describe('rttApiClient circuit breaker integration', () => {
  describe('getRTTApiHealth', () => {
    it('should return circuit breaker health statistics', () => {
      const health = getRTTApiHealth();

      expect(health).toMatchObject({
        state: expect.stringMatching(/CLOSED|OPEN|HALF_OPEN/),
        failureCount: expect.any(Number),
        successCount: expect.any(Number),
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000,
        isHealthy: expect.any(Boolean),
      });
    });

    it('should indicate healthy when circuit is closed', () => {
      // Reset to ensure clean state
      resetRTTApiCircuit();

      const health = getRTTApiHealth();

      expect(health.state).toBe('CLOSED');
      expect(health.isHealthy).toBe(true);
    });
  });

  describe('resetRTTApiCircuit', () => {
    it('should reset circuit breaker to closed state', () => {
      resetRTTApiCircuit();

      const health = getRTTApiHealth();

      expect(health.state).toBe('CLOSED');
      expect(health.failureCount).toBe(0);
      expect(health.successCount).toBe(0);
    });
  });

  describe('circuit breaker behavior during failures', () => {
    let mockFetch;

    beforeEach(() => {
      // Reset circuit before each test
      resetRTTApiCircuit();

      mockFetch = jest.fn();
    });

    it('should handle circuit breaker open errors gracefully', async () => {
      // Mock persistent failures to open the circuit
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      // Make multiple failing requests to open circuit (threshold = 5)
      // Use maxRetries: 0 to avoid retry delays in tests
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          rttSearch('PADTON', 'RDNG', '2024/01/01', {
            fetchImpl: mockFetch,
            user: 'test',
            pass: 'test',
            maxRetries: 0,
          }).catch((e) => e)
        );
      }

      await Promise.all(promises);

      // Circuit should now be open
      const health = getRTTApiHealth();
      expect(health.state).toBe('OPEN');
      expect(health.isHealthy).toBe(false);

      // Next request should fail with circuit breaker error
      try {
        await rttSearch('PADTON', 'RDNG', '2024/01/01', {
          fetchImpl: mockFetch,
          user: 'test',
          pass: 'test',
          maxRetries: 0,
        });
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RTTApiError);
        expect(error.message).toContain('temporarily unavailable');
        expect(error.message).toContain('circuit breaker open');
        expect(error.statusCode).toBe(503);
        expect(error.context.circuitOpen).toBe(true);
      }
    });

    it('should track successful requests and keep circuit closed', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ services: [] }),
      });

      // Make successful request
      const result = await rttSearch('PADTON', 'RDNG', '2024/01/01', {
        fetchImpl: mockFetch,
        user: 'test',
        pass: 'test',
      });

      expect(result).toEqual({ services: [] });

      const health = getRTTApiHealth();
      expect(health.state).toBe('CLOSED');
      expect(health.isHealthy).toBe(true);
      expect(health.failureCount).toBe(0);
    });

    it('should reset failure count after success', async () => {
      // One failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Error',
        text: async () => 'Error',
      });

      await rttSearch('PADTON', 'RDNG', '2024/01/01', {
        fetchImpl: mockFetch,
        user: 'test',
        pass: 'test',
        maxRetries: 0,
      }).catch(() => {});

      let health = getRTTApiHealth();
      expect(health.failureCount).toBe(1);

      // Success should reset failure count
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ services: [] }),
      });

      await rttSearch('PADTON', 'RDNG', '2024/01/01', {
        fetchImpl: mockFetch,
        user: 'test',
        pass: 'test',
        maxRetries: 0,
      });

      health = getRTTApiHealth();
      expect(health.failureCount).toBe(0);
      expect(health.state).toBe('CLOSED');
    });
  });

  describe('circuit breaker configuration', () => {
    it('should use appropriate thresholds for RTT API', () => {
      const health = getRTTApiHealth();

      // Verify configuration matches production requirements
      expect(health.failureThreshold).toBe(5); // Tolerant of some failures
      expect(health.successThreshold).toBe(2); // Quick recovery
      expect(health.timeout).toBe(60000); // 60s before retry
    });
  });
});
