import { rttSearch } from '../../../src/api/rttApiClient.js';

describe('rttSearch - retry logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('throws on non-ok after retries', async () => {
    const fakeFetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: () => Promise.resolve('Service temporarily unavailable'),
      })
    );

    const promise = rttSearch('search/CBG', 'KGX', '2025/10/18', {
      user: 'u',
      pass: 'p',
      fetchImpl: fakeFetch,
      maxRetries: 2,
    });

    // Run timers and wait for promise to settle
    const runTimersPromise = jest.runAllTimersAsync();
    await expect(promise).rejects.toThrow('RTT API request failed: 502');
    await runTimersPromise;

    // Should have retried 2 times (initial + 2 retries = 3 total calls)
    expect(fakeFetch).toHaveBeenCalledTimes(3);
  });

  test('retries on 429 rate limit', async () => {
    let callCount = 0;
    const fakeFetch = jest.fn(() => {
      callCount++;
      if (callCount <= 1) {
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: () => Promise.resolve('Rate limit exceeded'),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ services: [] }) });
    });

    const promise = rttSearch('search/CBG', 'KGX', '2025/10/18', {
      user: 'u',
      pass: 'p',
      fetchImpl: fakeFetch,
      maxRetries: 2,
    });

    await jest.runAllTimersAsync();
    const data = await promise;

    expect(data).toEqual({ services: [] });
    // Should have succeeded on 2nd attempt
    expect(fakeFetch).toHaveBeenCalledTimes(2);
  });

  test('wraps network errors and retries', async () => {
    let callCount = 0;
    const fakeFetch = jest.fn(() => {
      callCount++;
      if (callCount <= 1) {
        // Simulate network error (fetch rejection)
        return Promise.reject(new Error('ECONNREFUSED'));
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ services: [] }) });
    });

    const promise = rttSearch('search/CBG', 'KGX', '2025/10/18', {
      user: 'u',
      pass: 'p',
      fetchImpl: fakeFetch,
      maxRetries: 2,
    });

    await jest.runAllTimersAsync();
    const data = await promise;

    expect(data).toEqual({ services: [] });
    // Should have succeeded on 2nd attempt after network error
    expect(fakeFetch).toHaveBeenCalledTimes(2);
  });

  test('throws wrapped network error after all retries exhausted', async () => {
    const fakeFetch = jest.fn(() => Promise.reject(new Error('Network timeout')));

    const promise = rttSearch('search/CBG', 'KGX', '2025/10/18', {
      user: 'u',
      pass: 'p',
      fetchImpl: fakeFetch,
      maxRetries: 2,
    });

    // Run timers and wait for promise to settle
    const runTimersPromise = jest.runAllTimersAsync();
    await expect(promise).rejects.toThrow('Network error calling RTT API');
    await runTimersPromise;

    // Should have tried 3 times (initial + 2 retries)
    expect(fakeFetch).toHaveBeenCalledTimes(3);
  });

  test('does not retry network errors on final attempt', async () => {
    const fakeFetch = jest.fn(() => Promise.reject(new Error('DNS lookup failed')));

    const promise = rttSearch('search/CBG', 'KGX', '2025/10/18', {
      user: 'u',
      pass: 'p',
      fetchImpl: fakeFetch,
      maxRetries: 1,
    });

    // Run timers and wait for promise to settle
    const runTimersPromise = jest.runAllTimersAsync();
    await expect(promise).rejects.toThrow('Network error calling RTT API: DNS lookup failed');
    await runTimersPromise;

    // Should have tried 2 times (initial + 1 retry)
    expect(fakeFetch).toHaveBeenCalledTimes(2);
  });
});
