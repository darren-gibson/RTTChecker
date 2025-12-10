/**
 * Integration test for air quality mapping with on-time trains
 * Regression test for bug where on-time trains showed "poor" air quality
 */

import { STATUS_TO_AIR_QUALITY } from '../../src/domain/airQualityMapping.js';
import { deriveModeFromDelay } from '../../src/domain/modeMapping.js';
import { calculateDelayMinutes } from '../../src/domain/delayCalculation.js';
import type { RTTService } from '../../src/api/rttApiClient.js';

describe('Air Quality Integration - On-Time Train Bug Fix', () => {
  describe('delay -> mode -> air quality pipeline', () => {
    test('on-time train (null lateness) should map to Good air quality', () => {
      // Simulate RTT API response for on-time train
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: null as any, // RTT returns null for on-time
        },
      };

      // Step 1: Calculate delay (should return 0, not null)
      const delayMinutes = calculateDelayMinutes(service as RTTService);
      expect(delayMinutes).toBe(0);

      // Step 2: Derive mode from delay (should return mode 0 "On Time")
      const mode = deriveModeFromDelay(delayMinutes);
      expect(mode).toBe(0); // Mode 0 = On Time

      // Step 3: Map to air quality (should be Good/Green)
      const airQuality = STATUS_TO_AIR_QUALITY.on_time;
      expect(airQuality).toBe(1); // 1 = Good (Green in Google Home)
    });

    test('on-time train (0 lateness) should map to Good air quality', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: 0,
        },
      };

      const delayMinutes = calculateDelayMinutes(service as RTTService);
      expect(delayMinutes).toBe(0);

      const mode = deriveModeFromDelay(delayMinutes);
      expect(mode).toBe(0);

      const airQuality = STATUS_TO_AIR_QUALITY.on_time;
      expect(airQuality).toBe(1);
    });

    test('1 minute late should map to Good air quality (within threshold)', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: 1,
        },
      };

      const delayMinutes = calculateDelayMinutes(service as RTTService);
      expect(delayMinutes).toBe(1);

      const mode = deriveModeFromDelay(delayMinutes);
      expect(mode).toBe(0); // Still "On Time" (≤2 min threshold)

      const airQuality = STATUS_TO_AIR_QUALITY.on_time;
      expect(airQuality).toBe(1);
    });

    test('3 minute delay should map to Fair air quality', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: 3,
        },
      };

      const delayMinutes = calculateDelayMinutes(service as RTTService);
      expect(delayMinutes).toBe(3);

      const mode = deriveModeFromDelay(delayMinutes);
      expect(mode).toBe(1); // Mode 1 = Minor Delay

      const airQuality = STATUS_TO_AIR_QUALITY.minor_delay;
      expect(airQuality).toBe(2); // 2 = Fair (Yellow in Google Home)
    });

    test('major delay should map to Poor air quality', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: 15,
        },
      };

      const delayMinutes = calculateDelayMinutes(service as RTTService);
      expect(delayMinutes).toBe(15);

      const mode = deriveModeFromDelay(delayMinutes);
      expect(mode).toBe(3); // Mode 3 = Major Delay

      const airQuality = STATUS_TO_AIR_QUALITY.major_delay;
      expect(airQuality).toBe(4); // 4 = Poor (Red in Google Home)
    });
  });

  describe('regression: null lateness should NOT cause Unknown mode', () => {
    test('null lateness should result in mode 0, not mode 4', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: null as any,
        },
      };

      const delayMinutes = calculateDelayMinutes(service as RTTService);
      const mode = deriveModeFromDelay(delayMinutes);

      // Before fix: delayMinutes=null -> mode=4 (Unknown) -> airQuality=4 (Poor)
      // After fix: delayMinutes=0 -> mode=0 (On Time) -> airQuality=1 (Good)
      expect(delayMinutes).not.toBe(null);
      expect(delayMinutes).toBe(0);
      expect(mode).not.toBe(4); // Should NOT be Unknown
      expect(mode).toBe(0); // Should be On Time
    });

    test('missing service data should result in mode 4 (Unknown)', () => {
      const delayMinutes = calculateDelayMinutes(null);
      const mode = deriveModeFromDelay(delayMinutes);

      // This is the correct use of Unknown mode - when we truly have no data
      expect(delayMinutes).toBe(null);
      expect(mode).toBe(4); // Unknown is correct here
    });
  });
});
