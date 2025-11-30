/**
 * Unit tests for logger.js internals
 * Tests enforcement logic, Logger.get patching, and edge cases
 */

import {
  log,
  loggers,
  setLogLevel,
  Logger,
  Level,
  cleanupLoggerIntervals,
} from '../../../src/utils/logger.js';

describe('Logger enforcement logic', () => {
  afterAll(() => {
    // Clean up intervals to prevent Jest from hanging
    cleanupLoggerIntervals();
  });
  test('setLogLevel changes the log level', () => {
    const originalLevel = Logger.defaultLogLevel;

    setLogLevel('warn');
    expect(process.env.LOG_LEVEL).toBe('warn');

    setLogLevel('error');
    expect(process.env.LOG_LEVEL).toBe('error');

    // Restore
    setLogLevel('info');
    Logger.defaultLogLevel = originalLevel;
  });

  test('setLogLevel ignores invalid levels', () => {
    const originalLevel = Logger.defaultLogLevel;
    const originalEnv = process.env.LOG_LEVEL;

    setLogLevel('invalid-level');
    // Level should not have changed
    expect(Logger.defaultLogLevel).toBe(originalLevel);

    // Restore
    process.env.LOG_LEVEL = originalEnv;
  });

  test('setLogLevel with case variations', () => {
    const originalLevel = Logger.defaultLogLevel;

    setLogLevel('DEBUG');
    expect(process.env.LOG_LEVEL).toBe('DEBUG');

    setLogLevel('WaRn');
    expect(process.env.LOG_LEVEL).toBe('WaRn');

    // Restore
    setLogLevel('info');
    Logger.defaultLogLevel = originalLevel;
  });

  test('Logger.get creates facility loggers (Matter.js compatibility)', () => {
    const testFacility = 'test-facility-' + Date.now();
    const testLogger = Logger.get(testFacility);

    expect(testLogger).toBeDefined();
    expect(typeof testLogger.error).toBe('function');
    expect(typeof testLogger.warn).toBe('function');
    expect(typeof testLogger.info).toBe('function');
    expect(typeof testLogger.debug).toBe('function');

    // Note: With Pino-based logging, Logger.logLevels is a compatibility shim
    // The actual logging configuration is managed by Pino
  });

  test('exported loggers use Pino and support facility-based logging', () => {
    // Verify exported loggers are Pino instances with child context
    expect(loggers.rtt).toBeDefined();
    expect(loggers.matter).toBeDefined();
    expect(loggers.bridge).toBeDefined();

    // Verify each has logging methods
    expect(typeof loggers.rtt.info).toBe('function');
    expect(typeof loggers.matter.info).toBe('function');
    expect(typeof loggers.bridge.info).toBe('function');
  });

  test('exported log object has all methods', () => {
    expect(typeof log.error).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.debug).toBe('function');
  });

  test('exported log methods delegate to rttLogger', () => {
    const spy = jest.spyOn(loggers.rtt, 'info');
    log.info('test message');
    expect(spy).toHaveBeenCalledWith('test message');
    spy.mockRestore();
  });

  test('exported loggers object has all facilities', () => {
    expect(loggers.rtt).toBeDefined();
    expect(loggers.matter).toBeDefined();
    expect(loggers.bridge).toBeDefined();

    // Verify they're actual logger instances
    expect(typeof loggers.rtt.error).toBe('function');
    expect(typeof loggers.matter.warn).toBe('function');
    expect(typeof loggers.bridge.info).toBe('function');
  });

  test('exports Logger and Level for advanced usage', () => {
    expect(Logger).toBeDefined();
    expect(Level).toBeDefined();
    expect(Level.DEBUG).toBe(0);
    expect(Level.INFO).toBe(1);
    expect(Level.NOTICE).toBe(2);
    expect(Level.WARN).toBe(3);
    expect(Level.ERROR).toBe(4);
    expect(Level.FATAL).toBe(5);
  });

  test('log methods work with multiple arguments', () => {
    const spy = jest.spyOn(loggers.rtt, 'error');
    log.error('Error:', { code: 500 }, 'details');
    // Pino format: (obj, msg) where obj contains args
    expect(spy).toHaveBeenCalledWith({ args: [{ code: 500 }, 'details'] }, 'Error:');
    spy.mockRestore();
  });

  test('loggers bridge facility exists and works', () => {
    const spy = jest.spyOn(loggers.bridge, 'warn');
    loggers.bridge.warn('bridge warning');
    // Direct Pino logger call
    expect(spy).toHaveBeenCalledWith('bridge warning');
    spy.mockRestore();
  });

  test('loggers matter facility exists and works', () => {
    const spy = jest.spyOn(loggers.matter, 'debug');
    loggers.matter.debug('matter debug');
    // Direct Pino logger call
    expect(spy).toHaveBeenCalledWith('matter debug');
    spy.mockRestore();
  });
});
