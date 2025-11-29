import { calculateOnTimeStatus } from '../../../src/RTTBridge.js';

describe('calculateOnTimeStatus', () => {
  test('returns unknown for null/undefined service', () => {
    expect(calculateOnTimeStatus(null)).toBe('unknown');
    expect(calculateOnTimeStatus(undefined)).toBe('unknown');
  });

  test('returns major delay for cancelled trains', () => {
    const service = {
      locationDetail: {
        cancelReasonCode: 'CANCEL',
        displayAs: 'CANCELLED_CALL'
      }
    };
    expect(calculateOnTimeStatus(service)).toBe('major_delay');
  });

  test('maps lateness ranges correctly', () => {
    const createService = (lateness) => ({
      locationDetail: { realtimeActivated: true, realtimeGbttDepartureLateness: lateness }
    });

    // Note: Uses absolute value, so -2 early = 2 minutes = on_time, -5 early = 5 minutes = minor_delay
    expect(calculateOnTimeStatus(createService(-2))).toBe('on_time'); // 2 min early
    expect(calculateOnTimeStatus(createService(0))).toBe('on_time'); // On time
    expect(calculateOnTimeStatus(createService(2))).toBe('on_time'); // 2 min late
    expect(calculateOnTimeStatus(createService(3))).toBe('minor_delay'); // 3 min late
    expect(calculateOnTimeStatus(createService(5))).toBe('minor_delay'); // 5 min late
    expect(calculateOnTimeStatus(createService(6))).toBe('delayed'); // 6 min late
    expect(calculateOnTimeStatus(createService(10))).toBe('delayed'); // 10 min late
    expect(calculateOnTimeStatus(createService(11))).toBe('major_delay'); // 11 min late
    expect(calculateOnTimeStatus(createService(60))).toBe('major_delay'); // 1 hour late
  });

  test('calculates lateness from booked vs realtime when lateness field not provided', () => {
    const service = {
      locationDetail: {
        realtimeActivated: true,
        gbttBookedDeparture: '1030',
        realtimeDeparture: '1040'
      }
    };
    // 10:40 - 10:30 = 10 minutes late
    expect(calculateOnTimeStatus(service)).toBe('delayed');
  });
});
