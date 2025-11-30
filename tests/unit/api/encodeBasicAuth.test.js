import { encodeBasicAuth } from '../../../src/api/rttApiClient.js';

describe('encodeBasicAuth', () => {
  test('encodes credentials', () => {
    expect(encodeBasicAuth('a', 'b')).toBe(Buffer.from('a:b').toString('base64'));
  });
});
