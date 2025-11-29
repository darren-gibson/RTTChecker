import { parseTime as hhmmToMins } from '../../../src/timeUtils.js';

describe('time utilities', () => {
  test('hhmmToMins converts HHmm to minutes', () => {
    expect(hhmmToMins('0000')).toBe(0);
    expect(hhmmToMins('0100')).toBe(60);
    expect(hhmmToMins('0930')).toBe(570);
    expect(hhmmToMins('2359')).toBe(1439);
  });
});
