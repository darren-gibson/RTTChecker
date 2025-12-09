/**
 * Unit tests for air quality mapping
 */

import { describe, test, expect } from '@jest/globals';

import {
  STATUS_TO_AIR_QUALITY,
  AirQuality,
  AIR_QUALITY_NAMES,
  AIR_QUALITY_COLORS,
} from '../../src/domain/airQualityMapping.js';
import { deriveModeFromDelay, MODE_TO_STATUS } from '../../src/domain/modeMapping.js';

describe('Air Quality Mapping', () => {
  describe('STATUS_TO_AIR_QUALITY', () => {
    test('on_time maps to Good (1)', () => {
      expect(STATUS_TO_AIR_QUALITY.on_time).toBe(AirQuality.Good);
      expect(STATUS_TO_AIR_QUALITY.on_time).toBe(1);
    });

    test('minor_delay maps to Fair (2)', () => {
      expect(STATUS_TO_AIR_QUALITY.minor_delay).toBe(AirQuality.Fair);
      expect(STATUS_TO_AIR_QUALITY.minor_delay).toBe(2);
    });

    test('delayed maps to Moderate (3)', () => {
      expect(STATUS_TO_AIR_QUALITY.delayed).toBe(AirQuality.Moderate);
      expect(STATUS_TO_AIR_QUALITY.delayed).toBe(3);
    });

    test('major_delay maps to Poor (4)', () => {
      expect(STATUS_TO_AIR_QUALITY.major_delay).toBe(AirQuality.Poor);
      expect(STATUS_TO_AIR_QUALITY.major_delay).toBe(4);
    });

    test('unknown maps to Poor (4) - VeryPoor not supported', () => {
      expect(STATUS_TO_AIR_QUALITY.unknown).toBe(AirQuality.Poor);
      expect(STATUS_TO_AIR_QUALITY.unknown).toBe(4);
    });

    test('critical maps to Poor (4) - VeryPoor not supported', () => {
      expect(STATUS_TO_AIR_QUALITY.critical).toBe(AirQuality.Poor);
      expect(STATUS_TO_AIR_QUALITY.critical).toBe(4);
    });
  });

  describe('AIR_QUALITY_NAMES', () => {
    test('maps numeric values to names correctly', () => {
      expect(AIR_QUALITY_NAMES[0]).toBe('Unknown');
      expect(AIR_QUALITY_NAMES[1]).toBe('Good');
      expect(AIR_QUALITY_NAMES[2]).toBe('Fair');
      expect(AIR_QUALITY_NAMES[3]).toBe('Moderate');
      expect(AIR_QUALITY_NAMES[4]).toBe('Poor');
      expect(AIR_QUALITY_NAMES[5]).toBe('VeryPoor');
    });
  });

  describe('AIR_QUALITY_COLORS', () => {
    test('maps numeric values to colors correctly', () => {
      expect(AIR_QUALITY_COLORS[0]).toBe('gray');
      expect(AIR_QUALITY_COLORS[1]).toBe('green');
      expect(AIR_QUALITY_COLORS[2]).toBe('yellow');
      expect(AIR_QUALITY_COLORS[3]).toBe('orange');
      expect(AIR_QUALITY_COLORS[4]).toBe('red');
      expect(AIR_QUALITY_COLORS[5]).toBe('dark red');
    });
  });

  describe('Zero delay integration', () => {
    test('0 minutes delay should result in Good air quality (green)', () => {
      // Derive mode from 0 delay
      const mode = deriveModeFromDelay(0);
      expect(mode).toBe(0); // on_time mode

      // Get status from mode
      const status = MODE_TO_STATUS[mode];
      expect(status).toBe('on_time');

      // Get air quality from status
      const airQuality = STATUS_TO_AIR_QUALITY[status!];
      expect(airQuality).toBe(AirQuality.Good);
      expect(airQuality).toBe(1);

      // Verify color and name
      expect(AIR_QUALITY_NAMES[airQuality]).toBe('Good');
      expect(AIR_QUALITY_COLORS[airQuality]).toBe('green');
    });

    test('1 minute delay should result in Good air quality (green)', () => {
      const mode = deriveModeFromDelay(1);
      const status = MODE_TO_STATUS[mode];
      const airQuality = STATUS_TO_AIR_QUALITY[status!];

      expect(mode).toBe(0); // on_time (≤ 2 min threshold)
      expect(status).toBe('on_time');
      expect(airQuality).toBe(AirQuality.Good);
      expect(AIR_QUALITY_NAMES[airQuality]).toBe('Good');
    });

    test('2 minute delay should result in Good air quality (green) - boundary', () => {
      const mode = deriveModeFromDelay(2);
      const status = MODE_TO_STATUS[mode];
      const airQuality = STATUS_TO_AIR_QUALITY[status!];

      expect(mode).toBe(0); // on_time (≤ 2 min threshold)
      expect(status).toBe('on_time');
      expect(airQuality).toBe(AirQuality.Good);
      expect(AIR_QUALITY_NAMES[airQuality]).toBe('Good');
    });

    test('3 minute delay should result in Fair air quality (yellow)', () => {
      const mode = deriveModeFromDelay(3);
      const status = MODE_TO_STATUS[mode];
      const airQuality = STATUS_TO_AIR_QUALITY[status!];

      expect(mode).toBe(1); // minor_delay
      expect(status).toBe('minor_delay');
      expect(airQuality).toBe(AirQuality.Fair);
      expect(AIR_QUALITY_NAMES[airQuality]).toBe('Fair');
    });

    test('-1 minute delay (early) should result in Good air quality', () => {
      const mode = deriveModeFromDelay(-1);
      const status = MODE_TO_STATUS[mode];
      const airQuality = STATUS_TO_AIR_QUALITY[status!];

      expect(mode).toBe(0); // on_time (abs(-1) = 1 ≤ 2)
      expect(status).toBe('on_time');
      expect(airQuality).toBe(AirQuality.Good);
    });

    test('null delay should result in Poor air quality (unknown)', () => {
      const mode = deriveModeFromDelay(null);
      const status = MODE_TO_STATUS[mode];
      const airQuality = STATUS_TO_AIR_QUALITY[status!];

      expect(mode).toBe(4); // unknown
      expect(status).toBe('unknown');
      expect(airQuality).toBe(AirQuality.Poor);
    });
  });

  describe('Delay range mapping', () => {
    const testCases = [
      { delay: 0, expected: 'Good', value: 1 },
      { delay: 1, expected: 'Good', value: 1 },
      { delay: 2, expected: 'Good', value: 1 },
      { delay: 3, expected: 'Fair', value: 2 },
      { delay: 4, expected: 'Fair', value: 2 },
      { delay: 5, expected: 'Fair', value: 2 },
      { delay: 6, expected: 'Moderate', value: 3 },
      { delay: 7, expected: 'Moderate', value: 3 },
      { delay: 10, expected: 'Moderate', value: 3 },
      { delay: 11, expected: 'Poor', value: 4 },
      { delay: 15, expected: 'Poor', value: 4 },
      { delay: 30, expected: 'Poor', value: 4 },
      { delay: 60, expected: 'Poor', value: 4 },
    ];

    testCases.forEach(({ delay, expected, value }) => {
      test(`${delay} minutes delay should be ${expected} (${value})`, () => {
        const mode = deriveModeFromDelay(delay);
        const status = MODE_TO_STATUS[mode];
        const airQuality = STATUS_TO_AIR_QUALITY[status!];
        const name = AIR_QUALITY_NAMES[airQuality];

        expect(name).toBe(expected);
        expect(airQuality).toBe(value);
      });
    });
  });
});
