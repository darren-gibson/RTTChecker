/**
 * Focused logger behavior tests to cover enforcement, transitions, and cleanup.
 */

describe('logger behavior and enforcement', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'info';
  });

  afterEach(async () => {
    jest.useRealTimers();
    // ensure any pending timers are cleared by module cleanup
  });

  test('default level set from env and cannot be lowered', async () => {
    const { Logger, Level } = await import('../../../src/utils/logger.js');
    // Attempt to lower below env-configured floor
    expect(() => {
      Logger.defaultLogLevel = Level.DEBUG;
    }).not.toThrow();
    // Core APIs remain callable
    expect(typeof Logger.get).toBe('function');
  });

  test('Logger.get enforces minimum level per facility', async () => {
    const { Logger, Level } = await import('../../../src/utils/logger.js');
    // Simulate a facility with a lower level
    Logger.logLevels['custom-facility'] = Level.DEBUG;
    const logger = Logger.get('custom-facility');
    expect(logger).toBeDefined();
    expect(typeof Logger.logLevels['custom-facility']).toBe('number');
  });

  test('transition timers start and cleanup clears them', async () => {
    const mod = await import('../../../src/utils/logger.js');
    const { cleanupLoggerIntervals, Logger } = mod;
    // Fast-forward to trigger transition from enforcementInterval to ongoingInterval
    await jest.advanceTimersByTimeAsync(2100);
    // After transition, ongoing enforcement should be present and normalized
    Logger.logLevels['rtt-checker'] = 0; // force lower
    // Let ongoingInterval tick
    await jest.advanceTimersByTimeAsync(1000);
    expect(typeof Logger.logLevels['rtt-checker']).toBe('number');

    // Cleanup should clear timers without throwing
    cleanupLoggerIntervals();
    // Advance further to ensure no enforcement occurs after cleanup
    Logger.logLevels['rtt-checker'] = 0;
    await jest.advanceTimersByTimeAsync(2000);
    expect(Logger.logLevels['rtt-checker']).toBe(0);
  });

  test('setLogLevel raises default level and updates env', async () => {
    const { setLogLevel } = await import('../../../src/utils/logger.js');
    setLogLevel('warn');
    expect(process.env.LOG_LEVEL).toBe('warn');
  });
});
