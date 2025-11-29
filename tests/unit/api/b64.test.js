import { b64 } from '../../../src/api/rttApiClient.js';

describe('b64', () => {
  test('encodes credentials', () => {
    expect(b64('a','b')).toBe(Buffer.from('a:b').toString('base64'));
  });
});
