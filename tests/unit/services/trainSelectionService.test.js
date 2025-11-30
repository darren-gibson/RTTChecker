import pickNextService from '../../../src/services/trainSelectionService.js';
import { adjustForDayRollover } from '../../../src/utils/timeUtils.js';

describe('pickNextService', () => {
  const baseService = (overrides = {}) => ({
    serviceUid: overrides.serviceUid || 'UID',
    locationDetail: {
      gbttBookedDeparture: overrides.dep || '0830',
      destination: overrides.destination || [{ tiploc: 'DEST', publicTime: '0915' }],
      origin: [{ tiploc: 'ORIG', description: 'Origin' }],
      platform: overrides.platform || '1'
    },
    ...overrides.extra
  });

  test('returns undefined for non-array input', () => {
    expect(pickNextService(null, 'DEST')).toBeUndefined();
  });

  test('excludes service without destination TIPLOC', () => {
    const svc = baseService({ destination: [{ tiploc: 'OTHER', publicTime: '0915' }] });
    const selected = pickNextService([svc], 'DEST', { now: new Date('2025-11-30T08:00:00Z'), minAfterMinutes: 10, windowMinutes: 120 });
    expect(selected).toBeUndefined();
  });

  test('filters out departures outside window', () => {
    const inWindow = baseService({ dep: '0815' });
    const outWindow = baseService({ dep: '0500', serviceUid: 'EARLY' });
    const selected = pickNextService([outWindow, inWindow], 'DEST', { now: new Date('2025-11-30T08:00:00Z'), minAfterMinutes: 5, windowMinutes: 30 });
    expect(selected).toBe(inWindow);
  });

  test('rolls over next-day departure (>1440 minutes) still considered', () => {
    // current time late night 23:50, target dep 00:10 next day
    const now = new Date('2025-11-30T23:50:00');
    const depStr = '0010';
    const svc = baseService({ dep: depStr });
    const selected = pickNextService([svc], 'DEST', { now, minAfterMinutes: 5, windowMinutes: 120 });
    expect(selected).toBe(svc);
    // validate rollover logic independently
    const nowMinutes = 23 * 60 + 50;
    const depMinsRaw = 10; // 00:10
    expect(adjustForDayRollover(depMinsRaw, nowMinutes)).toBe(depMinsRaw + 1440);
  });

  test('ranks by arrival time then departure time', () => {
    const svcA = baseService({ dep: '0830', destination: [{ tiploc: 'DEST', publicTime: '0930' }], serviceUid: 'A' });
    const svcB = baseService({ dep: '0840', destination: [{ tiploc: 'DEST', publicTime: '0920' }], serviceUid: 'B' });
    // B arrives earlier (0920 vs 0930) despite later departure
    const selected = pickNextService([svcA, svcB], 'DEST', { now: new Date('2025-11-30T08:00:00Z'), minAfterMinutes: 5, windowMinutes: 120 });
    expect(selected).toBe(svcB);
  });

  test('returns earliest candidate when multiple share arrival', () => {
    const svcA = baseService({ dep: '0830', destination: [{ tiploc: 'DEST', publicTime: '0930' }], serviceUid: 'A' });
    const svcB = baseService({ dep: '0825', destination: [{ tiploc: 'DEST', publicTime: '0930' }], serviceUid: 'B' });
    const selected = pickNextService([svcA, svcB], 'DEST', { now: new Date('2025-11-30T08:00:00Z'), minAfterMinutes: 5, windowMinutes: 120 });
    expect(selected).toBe(svcB); // earlier departure wins when arrival equal
  });
});