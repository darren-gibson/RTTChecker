// @ts-nocheck
import { describe, test, expect, beforeEach } from '@jest/globals';

import { validateConfig } from '../src/config.js';
import { ConfigurationError } from '../src/errors.js';

describe('Zod schema validation', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save and reset environment
    originalEnv = { ...process.env };
    // Set required fields by default
    process.env['RTT_USER'] = 'test';
    process.env['RTT_PASS'] = 'test';
  });

  afterEach(() => {
    // Restore original environment by clearing all keys and restoring originals
    // Note: process.env = originalEnv doesn't work properly in Node.js
    for (const key in process.env) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    for (const key in originalEnv) {
      process.env[key] = originalEnv[key];
    }
  });

  test('validates required fields', () => {
    delete process.env['RTT_USER'];
    delete process.env['RTT_PASS'];

    expect(() => validateConfig()).toThrow(ConfigurationError);
    expect(() => validateConfig()).toThrow(/RTT_USER/);
  });

  test('validates TIPLOC format', () => {
    process.env['ORIGIN_TIPLOC'] = 'invalid!';

    expect(() => validateConfig()).toThrow(ConfigurationError);
    expect(() => validateConfig()).toThrow(/ORIGIN_TIPLOC/);
  });

  test('validates numeric ranges', () => {
    process.env['PORT'] = '8080'; // Valid port

    expect(() => validateConfig()).not.toThrow();

    process.env['PORT'] = '70000'; // Invalid port

    expect(() => validateConfig()).toThrow(ConfigurationError);
    expect(() => validateConfig()).toThrow(/PORT/);
  });

  test('validates discriminator range (0-4095)', () => {
    process.env['DISCRIMINATOR'] = '5000'; // Invalid

    expect(() => validateConfig()).toThrow(ConfigurationError);
    expect(() => validateConfig()).toThrow(/DISCRIMINATOR/);
  });

  test('passes with valid configuration', () => {
    process.env['ORIGIN_TIPLOC'] = 'CAMBDGE';
    process.env['DEST_TIPLOC'] = 'KNGX';
    process.env['PORT'] = '8080';
    process.env['DISCRIMINATOR'] = '3840';

    expect(() => validateConfig()).not.toThrow();
  });
});
