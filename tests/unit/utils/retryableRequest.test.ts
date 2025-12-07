// @ts-nocheck
import {
  shouldRetry,
  DEFAULT_RETRY_CONFIG,
  NetworkError,
  withRetry,
  fetchJsonWithRetry,
  calculateBackoffDelay,
} from '../../../src/utils/retryableRequest.js';

describe('retryableRequest utilities', () => {
  describe('shouldRetry', () => {
    const cfg = { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 };
    test('exhausted attempts returns false', () => {
      expect(shouldRetry({ statusCode: 503 }, 2, cfg)).toBe(false);
    });
    test('non-retryable status code returns false', () => {
      expect(shouldRetry({ statusCode: 401 }, 0, cfg)).toBe(false);
    });
    test('retryable status code returns true', () => {
      expect(shouldRetry({ statusCode: 503 }, 0, cfg)).toBe(true);
    });
    test('explicit NetworkError retries', () => {
      expect(shouldRetry(new NetworkError('down'), 0, cfg)).toBe(true);
    });
    test('unclassified error without statusCode retries', () => {
      expect(shouldRetry(new Error('mystery'), 0, cfg)).toBe(true);
    });
    test('unknown status code not in lists does not retry', () => {
      expect(shouldRetry({ statusCode: 418 }, 0, cfg)).toBe(false); // "I'm a teapot" not in retryable list
    });
  });

  describe('withRetry', () => {
    test('succeeds after one retry on thrown error', async () => {
      let attempts = 0;
      const result = await withRetry(
        async () => {
          attempts++;
          if (attempts < 2) throw Object.assign(new Error('Boom'), { statusCode: 503 });
          return 'ok';
        },
        { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 }
      );
      expect(result).toBe('ok');
      expect(attempts).toBe(2);
    });
    test('throws last error after exhaustion', async () => {
      let attempts = 0;
      await expect(
        withRetry(
          async () => {
            attempts++;
            throw Object.assign(new Error('Still bad'), { statusCode: 503 });
          },
          { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 5 }
        )
      ).rejects.toThrow('Still bad');
      expect(attempts).toBe(2); // initial + 1 retry
    });
    test('non-retryable status fails immediately (no retries)', async () => {
      let attempts = 0;
      await expect(
        withRetry(
          async () => {
            attempts++;
            throw Object.assign(new Error('Auth'), { statusCode: 401 });
          },
          { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 5 }
        )
      ).rejects.toThrow('Auth');
      expect(attempts).toBe(1);
    });
    test('backoff delay respects jitter bounds (mocked Math.random)', async () => {
      const originalRandom = Math.random;
      try {
        Math.random = () => 0; // lower bound
        const low = calculateBackoffDelay(1, {
          ...DEFAULT_RETRY_CONFIG,
          baseDelayMs: 100,
          maxDelayMs: 500,
        });
        Math.random = () => 1; // upper bound (30% jitter)
        const high = calculateBackoffDelay(1, {
          ...DEFAULT_RETRY_CONFIG,
          baseDelayMs: 100,
          maxDelayMs: 500,
        });
        expect(low).toBeGreaterThanOrEqual(200); // 100*2 + 0
        expect(low).toBeLessThanOrEqual(500);
        expect(high).toBeGreaterThan(low);
        expect(high).toBeLessThanOrEqual(500); // capped by maxDelayMs
      } finally {
        Math.random = originalRandom;
      }
    });
  });

  describe('fetchJsonWithRetry', () => {
    test('retries on 503 then succeeds', async () => {
      let call = 0;
      const fetchImpl = jest.fn(() => {
        call++;
        if (call === 1) {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            text: () => Promise.resolve('down'),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ value: 42 }) });
      });
      const data = await fetchJsonWithRetry(
        'http://x/test',
        { fetchImpl },
        { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 }
      );
      expect(data).toEqual({ value: 42 });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });
    test('fast fails on non-retryable status', async () => {
      const fetchImpl = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: () => Promise.resolve('bad creds'),
        })
      );
      await expect(
        fetchJsonWithRetry('http://x/auth', { fetchImpl }, { maxRetries: 3 })
      ).rejects.toThrow('HTTP request failed: 401 Unauthorized');
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
    test('wraps raw network error in NetworkError', async () => {
      const original = new Error('ECONNRESET');
      const fetchImpl = jest.fn(() => Promise.reject(original));
      await expect(
        fetchJsonWithRetry(
          'http://x/net',
          { fetchImpl },
          { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 5 }
        )
      ).rejects.toThrow('ECONNRESET');
      const firstError = fetchImpl.mock.results[0].value.catch((e) => e);
      await firstError; // ensure promise processed
    });
    test('custom buildError captures body and status', async () => {
      const fetchImpl = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
          text: () => Promise.resolve('temporary'),
        })
      );
      const buildError = (res, body) =>
        Object.assign(new Error(`Custom: ${res.status}`), {
          statusCode: res.status,
          responseBody: body,
        });
      await expect(
        fetchJsonWithRetry('http://x/custom', { fetchImpl }, { buildError, maxRetries: 0 })
      ).rejects.toThrow('Custom: 502');
    });
    test('merges headers from init and param', async () => {
      const fetchImpl = jest.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      );
      await fetchJsonWithRetry(
        'http://x/h',
        { fetchImpl, init: { headers: { A: '1' } }, headers: { B: '2' } },
        { maxRetries: 0 }
      );
      const passedInit = fetchImpl.mock.calls[0][1];
      expect(passedInit.headers).toEqual({ A: '1', B: '2' });
    });
  });
});
