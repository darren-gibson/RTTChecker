import { describe, it, expect } from '@jest/globals';

import {
  isTiploc,
  isWithinRange,
  isValidPort,
  isValidDiscriminator,
  isValidPasscode,
  isValidDeviceName,
  isValidLogLevel,
  isValidMatterLogFormat,
  sanitizeTiploc,
  clampValue,
} from '../../../src/utils/validation.js';

describe('validation utilities', () => {
  describe('isTiploc()', () => {
    it('should accept valid TIPLOCs', () => {
      expect(isTiploc('CAMBDGE')).toBe(true);
      expect(isTiploc('KNGX')).toBe(true);
      expect(isTiploc('ABC')).toBe(true); // Minimum length
      expect(isTiploc('ABCD1234')).toBe(true); // Maximum length
      expect(isTiploc('LON123')).toBe(true); // Alphanumeric
    });

    it('should reject invalid TIPLOCs', () => {
      expect(isTiploc('kngx')).toBe(false); // Lowercase
      expect(isTiploc('AB')).toBe(false); // Too short
      expect(isTiploc('ABCDEFGHI')).toBe(false); // Too long
      expect(isTiploc('ABC-DEF')).toBe(false); // Invalid characters
      expect(isTiploc('ABC DEF')).toBe(false); // Space
      expect(isTiploc('')).toBe(false); // Empty
      expect(isTiploc(null)).toBe(false); // Null
      expect(isTiploc(undefined)).toBe(false); // Undefined
      expect(isTiploc(123)).toBe(false); // Number
    });
  });

  describe('isWithinRange()', () => {
    it('should accept values within range', () => {
      expect(isWithinRange(50, 0, 100)).toBe(true);
      expect(isWithinRange(0, 0, 100)).toBe(true); // Min boundary
      expect(isWithinRange(100, 0, 100)).toBe(true); // Max boundary
      expect(isWithinRange(-5, -10, 10)).toBe(true); // Negative range
    });

    it('should reject values outside range', () => {
      expect(isWithinRange(-1, 0, 100)).toBe(false); // Below min
      expect(isWithinRange(101, 0, 100)).toBe(false); // Above max
      expect(isWithinRange(NaN, 0, 100)).toBe(false); // NaN
      expect(isWithinRange('50', 0, 100)).toBe(false); // String
      expect(isWithinRange(null, 0, 100)).toBe(false); // Null
    });
  });

  describe('isValidPort()', () => {
    it('should accept valid ports', () => {
      expect(isValidPort(1)).toBe(true); // Minimum
      expect(isValidPort(8080)).toBe(true); // Common
      expect(isValidPort(65535)).toBe(true); // Maximum
    });

    it('should reject invalid ports', () => {
      expect(isValidPort(0)).toBe(false); // Below min
      expect(isValidPort(65536)).toBe(false); // Above max
      expect(isValidPort(-1)).toBe(false); // Negative
      expect(isValidPort(NaN)).toBe(false); // NaN
    });
  });

  describe('isValidDiscriminator()', () => {
    it('should accept valid discriminators', () => {
      expect(isValidDiscriminator(0)).toBe(true); // Minimum
      expect(isValidDiscriminator(3840)).toBe(true); // Common
      expect(isValidDiscriminator(4095)).toBe(true); // Maximum
    });

    it('should reject invalid discriminators', () => {
      expect(isValidDiscriminator(-1)).toBe(false); // Below min
      expect(isValidDiscriminator(4096)).toBe(false); // Above max
      expect(isValidDiscriminator(5000)).toBe(false); // Way above max
    });
  });

  describe('isValidPasscode()', () => {
    it('should accept valid passcodes', () => {
      expect(isValidPasscode(1)).toBe(true); // Minimum
      expect(isValidPasscode(20202021)).toBe(true); // Common
      expect(isValidPasscode(99999999)).toBe(true); // Maximum
    });

    it('should reject invalid passcodes', () => {
      expect(isValidPasscode(0)).toBe(false); // Below min
      expect(isValidPasscode(100000000)).toBe(false); // Above max
      expect(isValidPasscode(-1)).toBe(false); // Negative
    });
  });

  describe('isValidDeviceName()', () => {
    it('should accept valid device names', () => {
      expect(isValidDeviceName('Train Status')).toBe(true);
      expect(isValidDeviceName('A')).toBe(true); // Single char
      expect(isValidDeviceName('a'.repeat(64))).toBe(true); // Max length
      expect(isValidDeviceName('Device-123')).toBe(true); // Alphanumeric with hyphen
      expect(isValidDeviceName('Test (Device)')).toBe(true); // With parentheses
    });

    it('should reject invalid device names', () => {
      expect(isValidDeviceName('')).toBe(false); // Empty
      expect(isValidDeviceName('a'.repeat(65))).toBe(false); // Too long
      expect(isValidDeviceName('Test\nDevice')).toBe(false); // Newline
      expect(isValidDeviceName('Test→Device')).toBe(false); // Non-ASCII
      expect(isValidDeviceName(null)).toBe(false); // Null
      expect(isValidDeviceName(undefined)).toBe(false); // Undefined
      expect(isValidDeviceName(123)).toBe(false); // Number
    });
  });

  describe('isValidLogLevel()', () => {
    it('should accept valid log levels', () => {
      expect(isValidLogLevel('trace')).toBe(true);
      expect(isValidLogLevel('debug')).toBe(true);
      expect(isValidLogLevel('info')).toBe(true);
      expect(isValidLogLevel('warn')).toBe(true);
      expect(isValidLogLevel('error')).toBe(true);
      expect(isValidLogLevel('fatal')).toBe(true);
      expect(isValidLogLevel('silent')).toBe(true);
    });

    it('should reject invalid log levels', () => {
      expect(isValidLogLevel('verbose')).toBe(false);
      expect(isValidLogLevel('INFO')).toBe(false); // Case sensitive
      expect(isValidLogLevel('')).toBe(false);
      expect(isValidLogLevel(null)).toBe(false);
    });
  });

  describe('isValidMatterLogFormat()', () => {
    it('should accept valid Matter log formats', () => {
      expect(isValidMatterLogFormat('ansi')).toBe(true);
      expect(isValidMatterLogFormat('plain')).toBe(true);
      expect(isValidMatterLogFormat('html')).toBe(true);
    });

    it('should reject invalid Matter log formats', () => {
      expect(isValidMatterLogFormat('json')).toBe(false);
      expect(isValidMatterLogFormat('ANSI')).toBe(false); // Case sensitive
      expect(isValidMatterLogFormat('')).toBe(false);
    });
  });

  describe('sanitizeTiploc()', () => {
    it('should sanitize valid TIPLOCs', () => {
      expect(sanitizeTiploc('cambdge')).toBe('CAMBDGE'); // Uppercase
      expect(sanitizeTiploc('  KNGX  ')).toBe('KNGX'); // Trim
      expect(sanitizeTiploc(' cambdge ')).toBe('CAMBDGE'); // Both
      expect(sanitizeTiploc('ABC123')).toBe('ABC123'); // Alphanumeric
    });

    it('should return null for invalid TIPLOCs', () => {
      expect(sanitizeTiploc('AB')).toBe(null); // Too short
      expect(sanitizeTiploc('ABCDEFGHI')).toBe(null); // Too long
      expect(sanitizeTiploc('ABC-DEF')).toBe(null); // Invalid chars
      expect(sanitizeTiploc('')).toBe(null); // Empty
      expect(sanitizeTiploc(null)).toBe(null); // Null
      expect(sanitizeTiploc(undefined)).toBe(null); // Undefined
      expect(sanitizeTiploc(123)).toBe(null); // Number
    });
  });

  describe('clampValue()', () => {
    it('should clamp values within range', () => {
      expect(clampValue(50, 0, 100, 25)).toBe(50); // In range
      expect(clampValue(0, 0, 100, 25)).toBe(0); // At min
      expect(clampValue(100, 0, 100, 25)).toBe(100); // At max
    });

    it('should clamp values outside range', () => {
      expect(clampValue(150, 0, 100, 25)).toBe(100); // Above max
      expect(clampValue(-10, 0, 100, 25)).toBe(0); // Below min
    });

    it('should use default for invalid values', () => {
      expect(clampValue(NaN, 0, 100, 25)).toBe(25);
      expect(clampValue(null, 0, 100, 25)).toBe(25);
      expect(clampValue(undefined, 0, 100, 25)).toBe(25);
      expect(clampValue('50', 0, 100, 25)).toBe(25); // String
    });

    it('should handle negative ranges', () => {
      expect(clampValue(-5, -10, 10, 0)).toBe(-5);
      expect(clampValue(-15, -10, 10, 0)).toBe(-10);
      expect(clampValue(15, -10, 10, 0)).toBe(10);
    });
  });
});
