/**
 * Unit tests for delay calculation functions
 * Tests the bug fix: on-time trains (null lateness) should return 0, not null
 */

import { calculateDelayMinutes, hasDelayChanged } from '../../../src/domain/delayCalculation.js';
import type { RTTService } from '../../../src/api/rttApiClient.js';

describe('calculateDelayMinutes', () => {
  describe('on-time trains (regression test for air quality bug)', () => {
    test('should return 0 when realtimeGbttDepartureLateness is null', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: null as any, // RTT API can return null for on-time trains
          realtimeWttDepartureLateness: undefined,
        },
      };
      // Bug fix: Previously returned null, causing mode 4 (Unknown) -> "poor" air quality
      expect(calculateDelayMinutes(service as RTTService)).toBe(0);
    });

    test('should return 0 when realtimeWttDepartureLateness is null', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: undefined,
          realtimeWttDepartureLateness: null as any, // RTT API can return null for on-time trains
        },
      };
      expect(calculateDelayMinutes(service as RTTService)).toBe(0);
    });

    test('should return 0 when both lateness fields are null', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: null as any,
          realtimeWttDepartureLateness: null as any,
        },
      };
      expect(calculateDelayMinutes(service as RTTService)).toBe(0);
    });

    test('should return 0 when lateness is explicitly 0', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: 0,
          realtimeWttDepartureLateness: undefined,
        },
      };
      expect(calculateDelayMinutes(service as RTTService)).toBe(0);
    });

    test('should return 0 when lateness is NaN (treated as on-time)', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: NaN,
          realtimeWttDepartureLateness: undefined,
        },
      };
      expect(calculateDelayMinutes(service as RTTService)).toBe(0);
    });
  });

  describe('delayed trains', () => {
    test('should return positive number for late trains (realtimeGbttDepartureLateness)', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: 5,
          realtimeWttDepartureLateness: undefined,
        },
      };
      expect(calculateDelayMinutes(service as RTTService)).toBe(5);
    });

    test('should return positive number for late trains (realtimeWttDepartureLateness)', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: undefined,
          realtimeWttDepartureLateness: 12,
        },
      };
      expect(calculateDelayMinutes(service as RTTService)).toBe(12);
    });

    test('should prefer realtimeGbttDepartureLateness over realtimeWttDepartureLateness', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: 3,
          realtimeWttDepartureLateness: 8,
        },
      };
      expect(calculateDelayMinutes(service as RTTService)).toBe(3);
    });

    test('should handle large delays', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: 45,
          realtimeWttDepartureLateness: undefined,
        },
      };
      expect(calculateDelayMinutes(service as RTTService)).toBe(45);
    });
  });

  describe('early trains', () => {
    test('should return negative number for early trains', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: -3,
          realtimeWttDepartureLateness: undefined,
        },
      };
      expect(calculateDelayMinutes(service as RTTService)).toBe(-3);
    });
  });

  describe('missing data', () => {
    test('should return null when service is null', () => {
      expect(calculateDelayMinutes(null)).toBe(null);
    });

    test('should return null when locationDetail is missing', () => {
      const service: Partial<RTTService> = {
        locationDetail: undefined,
      };
      expect(calculateDelayMinutes(service as RTTService)).toBe(null);
    });

    test('should return null when service has no locationDetail property', () => {
      const service = {} as RTTService;
      expect(calculateDelayMinutes(service)).toBe(null);
    });
  });

  describe('string to number conversion', () => {
    test('should convert string lateness to number', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: '7' as any, // RTT API might return strings
          realtimeWttDepartureLateness: undefined,
        },
      };
      expect(calculateDelayMinutes(service as RTTService)).toBe(7);
    });

    test('should handle non-numeric strings as on-time (NaN -> 0)', () => {
      const service: Partial<RTTService> = {
        locationDetail: {
          realtimeGbttDepartureLateness: 'invalid' as any,
          realtimeWttDepartureLateness: undefined,
        },
      };
      expect(calculateDelayMinutes(service as RTTService)).toBe(0);
    });
  });
});

describe('hasDelayChanged', () => {
  test('should return true when delay changes from null to 0', () => {
    expect(hasDelayChanged(null, 0)).toBe(true);
  });

  test('should return true when delay changes from 0 to null', () => {
    expect(hasDelayChanged(0, null)).toBe(true);
  });

  test('should return true when delay value changes', () => {
    expect(hasDelayChanged(5, 7)).toBe(true);
  });

  test('should return false when delay stays the same', () => {
    expect(hasDelayChanged(5, 5)).toBe(false);
  });

  test('should return false when both values are null', () => {
    expect(hasDelayChanged(null, null)).toBe(false);
  });

  test('should return true when delay changes from positive to negative', () => {
    expect(hasDelayChanged(5, -2)).toBe(true);
  });

  test('should return true when delay changes from 0 to positive', () => {
    expect(hasDelayChanged(0, 3)).toBe(true);
  });
});
