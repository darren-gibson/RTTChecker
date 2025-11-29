import { validateConfig } from '../src/config.js';
import { ConfigurationError } from '../src/errors.js';

describe('Zod schema validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('validates required fields', () => {
    delete process.env.RTT_USER;
    delete process.env.RTT_PASS;

    expect(() => validateConfig()).toThrow(ConfigurationError);
    expect(() => validateConfig()).toThrow(/RTT_USER/);
  });

  test('validates TIPLOC format', () => {
    process.env.RTT_USER = 'test';
    process.env.RTT_PASS = 'test';
    process.env.ORIGIN_TIPLOC = 'invalid!';

    expect(() => validateConfig()).toThrow(ConfigurationError);
    expect(() => validateConfig()).toThrow(/ORIGIN_TIPLOC/);
  });

  test('validates numeric ranges', () => {
    process.env.RTT_USER = 'test';
    process.env.RTT_PASS = 'test';
    process.env.PORT = '8080'; // Valid port

    expect(() => validateConfig()).not.toThrow();

    process.env.PORT = '70000'; // Invalid port

    expect(() => validateConfig()).toThrow(ConfigurationError);
    expect(() => validateConfig()).toThrow(/PORT/);
  });

  test('validates discriminator range (0-4095)', () => {
    process.env.RTT_USER = 'test';
    process.env.RTT_PASS = 'test';
    process.env.DISCRIMINATOR = '5000'; // Invalid

    expect(() => validateConfig()).toThrow(ConfigurationError);
    expect(() => validateConfig()).toThrow(/DISCRIMINATOR/);
  });

  test('passes with valid configuration', () => {
    process.env.RTT_USER = 'test';
    process.env.RTT_PASS = 'test';
    process.env.ORIGIN_TIPLOC = 'CAMBDGE';
    process.env.DEST_TIPLOC = 'KNGX';
    process.env.PORT = '8080';
    process.env.DISCRIMINATOR = '3840';

    expect(() => validateConfig()).not.toThrow();
  });
});
