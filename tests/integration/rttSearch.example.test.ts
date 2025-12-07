// @ts-nocheck
import fs from 'fs';
import path from 'path';

import { rttSearch, encodeBasicAuth } from '../../src/api/rttApiClient.js';

describe('rttSearch with example response', () => {
  test('returns parsed JSON from example search.json and calls fetch with proper headers', async () => {
    const file = path.join(__dirname, '../examples', 'search.json');
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);

    const fakeFetch = jest.fn((url, opts) => Promise.resolve({ ok: true, json: () => parsed }));

    const user = 'testuser';
    const pass = 'testpass';
    const date = '2025/10/17';
    const crs = 'CAMBDGE';

    const result = await rttSearch(crs, 'KNGX', date, { user, pass, fetchImpl: fakeFetch });

    expect(result).toEqual(parsed);
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    expect(fakeFetch).toHaveBeenCalledWith(
      `https://api.rtt.io/api/v1/json/search/${crs}/to/KNGX/${date}`,
      expect.objectContaining({
        headers: { Authorization: `Basic ${encodeBasicAuth(user, pass)}` },
      })
    );
  });
});
