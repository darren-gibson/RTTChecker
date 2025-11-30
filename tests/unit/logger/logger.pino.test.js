/**
 * Tests for Pino-based logger functionality
 */

import { log, loggers, setLogLevel, Logger, Level } from '../../../src/utils/logger.js';

describe('Pino logger implementation', () => {
  test('setLogLevel with silent level', () => {
    setLogLevel('silent');
    expect(process.env.LOG_LEVEL).toBe('silent');

    // Reset to info for other tests
    setLogLevel('info');
  });

  test('setLogLevel with trace level', () => {
    setLogLevel('trace');
    expect(process.env.LOG_LEVEL).toBe('trace');

    // Reset
    setLogLevel('info');
  });

  test('setLogLevel with fatal level', () => {
    setLogLevel('fatal');
    expect(process.env.LOG_LEVEL).toBe('fatal');

    // Reset
    setLogLevel('info');
  });

  test('setLogLevel with invalid level does not throw', () => {
    expect(() => setLogLevel('invalid')).not.toThrow();

    // Reset
    setLogLevel('info');
  });

  test('log methods handle messages without extra args', () => {
    const spy = jest.spyOn(loggers.rtt, 'error');
    log.error('Simple error');
    expect(spy).toHaveBeenCalledWith('Simple error');
    spy.mockRestore();
  });

  test('log.warn works correctly', () => {
    const spy = jest.spyOn(loggers.rtt, 'warn');
    log.warn('Warning message');
    expect(spy).toHaveBeenCalledWith('Warning message');
    spy.mockRestore();
  });

  test('log.info works correctly', () => {
    const spy = jest.spyOn(loggers.rtt, 'info');
    log.info('Info message');
    expect(spy).toHaveBeenCalledWith('Info message');
    spy.mockRestore();
  });

  test('log.debug works correctly', () => {
    const spy = jest.spyOn(loggers.rtt, 'debug');
    log.debug('Debug message');
    expect(spy).toHaveBeenCalledWith('Debug message');
    spy.mockRestore();
  });

  test('Matter.js Logger bridge is configured', () => {
    // Verify Matter.js logger has been configured
    expect(Logger.defaultLogLevel).toBeDefined();
    expect(typeof Logger.defaultLogLevel).toBe('number');
  });

  test('Matter.js Level constants are available', () => {
    expect(Level.DEBUG).toBe(0);
    expect(Level.INFO).toBe(1);
    expect(Level.WARN).toBe(3);
    expect(Level.ERROR).toBe(4);
    expect(Level.FATAL).toBe(5);
  });

  test('Matter.js Logger.log bridge routes to Pino', () => {
    const spy = jest.spyOn(loggers.matter, 'error');

    // Simulate matter.js calling Logger.log
    Logger.log(Level.ERROR, 'Test error from matter.js');

    expect(spy).toHaveBeenCalledWith('Test error from matter.js');
    spy.mockRestore();
  });

  test('Matter.js Logger.log bridge handles non-string logs', () => {
    const spy = jest.spyOn(loggers.matter, 'info');

    // Simulate matter.js calling Logger.log with object
    Logger.log(Level.INFO, { message: 'Object log' });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('Matter.js Logger.log bridge handles unknown levels', () => {
    const spy = jest.spyOn(loggers.matter, 'info');

    // Simulate matter.js calling Logger.log with unknown level
    Logger.log(999, 'Unknown level');

    expect(spy).toHaveBeenCalledWith('Unknown level');
    spy.mockRestore();
  });

  test('Matter.js Logger.log bridge handles FATAL level', () => {
    const spy = jest.spyOn(loggers.matter, 'error');

    Logger.log(Level.FATAL, 'Fatal error');

    expect(spy).toHaveBeenCalledWith('Fatal error');
    spy.mockRestore();
  });

  test('Matter.js Logger.log bridge handles WARN level', () => {
    const spy = jest.spyOn(loggers.matter, 'warn');

    Logger.log(Level.WARN, 'Warning from matter');

    expect(spy).toHaveBeenCalledWith('Warning from matter');
    spy.mockRestore();
  });

  test('Matter.js Logger.log bridge handles DEBUG level', () => {
    const spy = jest.spyOn(loggers.matter, 'debug');

    Logger.log(Level.DEBUG, 'Debug from matter');

    expect(spy).toHaveBeenCalledWith('Debug from matter');
    spy.mockRestore();
  });
});
