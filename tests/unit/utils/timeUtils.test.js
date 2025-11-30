import {
  hhmmToMins,
  adjustForDayRollover,
  isWithinTimeWindow,
  formatDateYMD,
} from '../../../src/utils/timeUtils.js';

describe('time utilities', () => {
  describe('hhmmToMins', () => {
    test('converts HHmm to minutes', () => {
      expect(hhmmToMins('0000')).toBe(0);
      expect(hhmmToMins('0100')).toBe(60);
      expect(hhmmToMins('0930')).toBe(570);
      expect(hhmmToMins('2359')).toBe(1439);
    });
    test('handles invalid / short inputs', () => {
      expect(Number.isNaN(hhmmToMins(''))).toBe(true);
      expect(Number.isNaN(hhmmToMins('1'))).toBe(true);
      expect(Number.isNaN(hhmmToMins('99'))).toBe(true);
      expect(Number.isNaN(hhmmToMins(null))).toBe(true);
    });
    test('accepts numeric input preserving semantics', () => {
      expect(Number.isNaN(hhmmToMins(830))).toBe(true); // coerces to '830' length < 4
      expect(hhmmToMins(1230)).toBe(12 * 60 + 30);
    });
  });

  describe('adjustForDayRollover', () => {
    test('returns same day when scheduled after current', () => {
      expect(adjustForDayRollover(600, 500)).toBe(600);
    });
    test('rolls over to next day when scheduled earlier than current', () => {
      expect(adjustForDayRollover(120, 1400)).toBe(120 + 1440);
    });
    test('passes through NaN', () => {
      expect(Number.isNaN(adjustForDayRollover(NaN, 500))).toBe(true);
    });
    test('boundary midnight behavior', () => {
      // Current is just before midnight, scheduled is midnight of next day (0 < 1439 -> rollover)
      expect(adjustForDayRollover(0, 1439)).toBe(1440);
    });
  });

  describe('isWithinTimeWindow', () => {
    test('inclusive edges', () => {
      expect(isWithinTimeWindow(500, 500, 600)).toBe(true);
      expect(isWithinTimeWindow(600, 500, 600)).toBe(true);
    });
    test('outside window', () => {
      expect(isWithinTimeWindow(499, 500, 600)).toBe(false);
      expect(isWithinTimeWindow(601, 500, 600)).toBe(false);
    });
  });

  describe('formatDateYMD', () => {
    test('pads month and day', () => {
      expect(formatDateYMD(new Date('2025-01-05'))).toBe('2025/01/05');
    });
    test('handles double-digit month and day', () => {
      expect(formatDateYMD(new Date('2025-11-30'))).toBe('2025/11/30');
    });
    test('leap day formatting', () => {
      expect(formatDateYMD(new Date('2024-02-29'))).toBe('2024/02/29');
    });
  });
});
