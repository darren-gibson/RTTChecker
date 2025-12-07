import {
  STATUS_TO_MODE,
  MODE_TO_STATUS,
  deriveModeFromDelay,
} from '../../src/domain/modeMapping.js';

describe('modeMapping domain logic', () => {
  test('STATUS_TO_MODE and MODE_TO_STATUS are consistent for known statuses', () => {
    const statuses = ['on_time', 'minor_delay', 'delayed', 'major_delay', 'unknown'] as const;
    for (const status of statuses) {
      const mode = STATUS_TO_MODE[status];
      expect(mode).toBeGreaterThanOrEqual(0);
      expect(MODE_TO_STATUS[mode]).toBe(status);
    }
  });

  test('deriveModeFromDelay maps delays to correct modes at boundaries', () => {
    // Thresholds come from Timing.LATE_THRESHOLDS in constants.js
    expect(deriveModeFromDelay(null)).toBe(STATUS_TO_MODE.unknown);
    expect(deriveModeFromDelay(undefined)).toBe(STATUS_TO_MODE.unknown);
    expect(deriveModeFromDelay(NaN)).toBe(STATUS_TO_MODE.unknown);

    // On time band (±2 minutes)
    expect(deriveModeFromDelay(0)).toBe(STATUS_TO_MODE.on_time);
    expect(deriveModeFromDelay(2)).toBe(STATUS_TO_MODE.on_time);
    expect(deriveModeFromDelay(-2)).toBe(STATUS_TO_MODE.on_time);

    // Minor delay band (3–5 minutes)
    expect(deriveModeFromDelay(3)).toBe(STATUS_TO_MODE.minor_delay);
    expect(deriveModeFromDelay(5)).toBe(STATUS_TO_MODE.minor_delay);

    // Delayed band (6–10 minutes)
    expect(deriveModeFromDelay(6)).toBe(STATUS_TO_MODE.delayed);
    expect(deriveModeFromDelay(10)).toBe(STATUS_TO_MODE.delayed);

    // Major delay band (>10 minutes)
    expect(deriveModeFromDelay(11)).toBe(STATUS_TO_MODE.major_delay);
    expect(deriveModeFromDelay(60)).toBe(STATUS_TO_MODE.major_delay);
  });
});
