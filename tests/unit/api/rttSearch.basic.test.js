import { rttSearch } from '../../../src/api/rttApiClient.js';

describe('rttSearch - basic functionality', () => {
  test('calls fetch and returns json on ok', async () => {
    const fakeFetch = jest.fn(() => Promise.resolve({ ok: true, json: () => ({ services: [] }) }));
    const data = await rttSearch('search/CBG', 'KGX', '2025/10/18', {
      user: 'u',
      pass: 'p',
      fetchImpl: fakeFetch,
    });
    expect(data).toEqual({ services: [] });
    expect(fakeFetch).toHaveBeenCalled();
  });

  test('fast fails on 401 without retries', async () => {
    const fakeFetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid credentials'),
      })
    );
    await expect(
      rttSearch('search/CBG', 'KGX', '2025/10/18', { user: 'u', pass: 'p', fetchImpl: fakeFetch })
    ).rejects.toThrow('RTT API request failed: 401');
    // Should NOT retry on 401 (only 1 call)
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });
});
