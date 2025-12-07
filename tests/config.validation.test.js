import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { validateConfig } from '../src/config.js';
import { ConfigurationError } from '../src/errors.js';

describe('config validation integration', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Set minimum required config
    process.env.RTT_USER = 'test-user';
    process.env.RTT_PASS = 'test-pass';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('TIPLOC validation with custom validators', () => {
    it('should accept valid TIPLOCs', () => {
      process.env.ORIGIN_TIPLOC = 'PADTON';
      process.env.DEST_TIPLOC = 'RDNG';

      expect(() => validateConfig()).not.toThrow();
    });

    it('should accept TIPLOCs with whitespace (sanitized)', () => {
      process.env.ORIGIN_TIPLOC = '  padton  ';
      process.env.DEST_TIPLOC = 'rdng';

      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject invalid ORIGIN_TIPLOC', () => {
      process.env.ORIGIN_TIPLOC = 'TOOLONG123'; // Too long

      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow(/ORIGIN_TIPLOC/);
      expect(() => validateConfig()).toThrow(/valid TIPLOC/);
    });

    it('should reject invalid DEST_TIPLOC', () => {
      process.env.DEST_TIPLOC = 'AB'; // Too short

      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow(/DEST_TIPLOC/);
    });

    it('should reject TIPLOC with special characters', () => {
      process.env.ORIGIN_TIPLOC = 'PAD-TON';

      expect(() => validateConfig()).toThrow(ConfigurationError);
    });
  });

  describe('port validation with custom validators', () => {
    it('should accept valid port numbers', () => {
      process.env.PORT = '8080';

      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject port 0', () => {
      process.env.PORT = '0';

      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow(/PORT/);
      expect(() => validateConfig()).toThrow(/valid port/);
    });

    it('should reject port above 65535', () => {
      process.env.PORT = '99999';

      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow(/PORT/);
    });

    it('should reject negative port', () => {
      process.env.PORT = '-1';

      expect(() => validateConfig()).toThrow(ConfigurationError);
    });
  });

  describe('discriminator validation with custom validators', () => {
    it('should accept valid discriminator', () => {
      process.env.DISCRIMINATOR = '3840';

      expect(() => validateConfig()).not.toThrow();
    });

    it('should accept discriminator 0', () => {
      process.env.DISCRIMINATOR = '0';

      expect(() => validateConfig()).not.toThrow();
    });

    it('should accept discriminator 4095', () => {
      process.env.DISCRIMINATOR = '4095';

      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject discriminator above 4095', () => {
      process.env.DISCRIMINATOR = '5000';

      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow(/DISCRIMINATOR/);
      expect(() => validateConfig()).toThrow(/0-4095/);
    });

    it('should reject negative discriminator', () => {
      process.env.DISCRIMINATOR = '-1';

      expect(() => validateConfig()).toThrow(ConfigurationError);
    });
  });

  describe('passcode validation with custom validators', () => {
    it('should accept valid passcode', () => {
      process.env.PASSCODE = '20202021';

      expect(() => validateConfig()).not.toThrow();
    });

    it('should accept passcode within valid range', () => {
      process.env.PASSCODE = '34567890';

      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject passcode of 0', () => {
      process.env.PASSCODE = '0';

      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow(/PASSCODE/);
    });

    it('should reject passcode above maximum', () => {
      process.env.PASSCODE = '999999999'; // 9 digits, too high

      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow(/PASSCODE/);
    });
  });

  describe('device name validation with custom validators', () => {
    it('should accept valid device names', () => {
      process.env.DEVICE_NAME = 'Train Status Device';
      process.env.STATUS_DEVICE_NAME = 'Status Monitor';

      expect(() => validateConfig()).not.toThrow();
    });

    it('should accept device name with spaces (printable ASCII)', () => {
      process.env.DEVICE_NAME = 'Valid Name With Spaces';

      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject device name too long', () => {
      process.env.DELAY_DEVICE_NAME = 'A'.repeat(70); // Too long (>64 chars)

      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow(/DELAY_DEVICE_NAME/);
      expect(() => validateConfig()).toThrow(/1-32/);
    });

    it('should reject device name with non-ASCII characters', () => {
      process.env.DEVICE_NAME = 'Device→Name'; // Contains non-ASCII arrow

      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow(/DEVICE_NAME/);
    });
  });

  describe('log level validation with custom validators', () => {
    it('should accept valid log levels', () => {
      const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];

      for (const level of validLevels) {
        process.env.LOG_LEVEL = level;
        expect(() => validateConfig()).not.toThrow();
      }
    });

    it('should reject invalid log level', () => {
      process.env.LOG_LEVEL = 'verbose';

      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow(/LOG_LEVEL/);
      expect(() => validateConfig()).toThrow(/valid Pino log level/);
    });
  });

  describe('Matter log format validation with custom validators', () => {
    it('should accept valid Matter log formats', () => {
      const validFormats = ['ansi', 'plain', 'html'];

      for (const format of validFormats) {
        process.env.MATTER_LOG_FORMAT = format;
        expect(() => validateConfig()).not.toThrow();
      }
    });

    it('should reject invalid Matter log format', () => {
      process.env.MATTER_LOG_FORMAT = 'json';

      expect(() => validateConfig()).toThrow(ConfigurationError);
      expect(() => validateConfig()).toThrow(/MATTER_LOG_FORMAT/);
      expect(() => validateConfig()).toThrow(/valid Matter log format/);
    });
  });

  describe('multiple validation errors', () => {
    it('should report all validation errors at once', () => {
      process.env.ORIGIN_TIPLOC = 'TOOLONGCODE';
      process.env.PORT = '99999';
      process.env.DISCRIMINATOR = '5000';

      try {
        validateConfig();
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect(error.message).toContain('ORIGIN_TIPLOC');
        expect(error.message).toContain('PORT');
        expect(error.message).toContain('DISCRIMINATOR');
      }
    });
  });

  describe('validation with defaults', () => {
    it('should validate successfully with only required fields', () => {
      // Only RTT_USER and RTT_PASS set
      expect(() => validateConfig()).not.toThrow();
    });

    it('should validate successfully with all optional fields valid', () => {
      process.env.ORIGIN_TIPLOC = 'CAMBDGE';
      process.env.DEST_TIPLOC = 'KNGX';
      process.env.MIN_AFTER_MINUTES = '30';
      process.env.WINDOW_MINUTES = '120';
      process.env.PORT = '9000';
      process.env.NODE_ENV = 'production';
      process.env.DEVICE_NAME = 'Test Device';
      process.env.DISCRIMINATOR = '1234';
      process.env.PASSCODE = '34567890';
      process.env.LOG_LEVEL = 'info';
      process.env.MATTER_LOG_FORMAT = 'ansi';

      expect(() => validateConfig()).not.toThrow();
    });
  });
});
