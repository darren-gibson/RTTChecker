import { hhmmToMins, mapLatenessToState, pickNextService, rttSearch, b64 } from '../src/RTTBridge.js';

describe('time utilities', () => {
  test('hhmmToMins converts HHmm to minutes', () => {
    expect(hhmmToMins('0000')).toBe(0);
    expect(hhmmToMins('0130')).toBe(90);
    expect(hhmmToMins('2359')).toBe(23*60 + 59);
  });
});

describe('mapLatenessToState', () => {
  test('maps null/undefined to unknown', () => {
    expect(mapLatenessToState(null)).toBe('unknown');
    expect(mapLatenessToState(undefined)).toBe('unknown');
  });

  test('maps ranges correctly', () => {
    expect(mapLatenessToState(0)).toBe('good');
    expect(mapLatenessToState(2)).toBe('good');
    expect(mapLatenessToState(3)).toBe('fair');
    expect(mapLatenessToState(5)).toBe('fair');
    expect(mapLatenessToState(6)).toBe('poor');
    expect(mapLatenessToState(10)).toBe('poor');
    expect(mapLatenessToState(11)).toBe('very poor');
  });
});

describe('pickNextService', () => {
  const services = [
    // short local run: 06:00 -> 06:20 (duration 20m)
  { locationDetail: { gbttBookedDeparture: '0600', origin: [{ workingTime: '060000' }], destination: [{ crs: 'KGX', tiploc: 'KNGX', description: 'London Kings Cross', workingTime: '062000' }] } },
    // longer run: 07:30 -> 09:00 (duration 90m)
  { locationDetail: { gbttBookedDeparture: '0730', origin: [{ workingTime: '073000' }], destination: [{ crs: 'KGX', tiploc: 'KNGX', description: 'London Kings Cross', workingTime: '090000' }] } },
    // even longer: 09:00 -> 11:00 (duration 120m)
  { locationDetail: { gbttBookedDeparture: '0900', origin: [{ workingTime: '090000' }], destination: [{ crs: 'KGX', tiploc: 'KNGX', description: 'London Kings Cross', workingTime: '110000' }] } }
  ];

  test('picks first service after given time', () => {
    // simulate now at 05:30 UTC => earliest 06:00 with minAfterMinutes=30
    const now1 = new Date('2025-10-17T05:30:00Z');
  expect(pickNextService(services, 'KNGX', { minAfterMinutes: 30, windowMinutes: 24*60, now: now1 }).locationDetail.gbttBookedDeparture).toBe('0600');

  // simulate now at 06:50 UTC => earliest 07:00 with minAfterMinutes=10
  // use a 3-hour window so the next-day 06:00 is not included
  const now2 = new Date('2025-10-17T06:50:00Z');
  expect(pickNextService(services, 'KNGX', { minAfterMinutes: 10, windowMinutes: 180, now: now2 }).locationDetail.gbttBookedDeparture).toBe('0730');

    // simulate now at 09:30 UTC => earliest 10:00, no service within window
    const now3 = new Date('2025-10-17T09:30:00Z');
  expect(pickNextService(services, 'KNGX', { minAfterMinutes: 30, windowMinutes: 10, now: now3 })).toBeUndefined();
  });

  test('selects next fastest train at least 20 minutes from now and within next hour', () => {
    // fixed 'now' at 09:00
    const now = new Date('2025-10-17T09:00:00Z');

    // create services: one departing at 09:25 (25 mins), duration 120 (not preferred)
    // another departing at 09:30 (30 mins), duration 60 (preferred, faster)
    // another departing at 10:50 (110 mins) outside the 1h window
    const services2 = [
  { locationDetail: { gbttBookedDeparture: '0925', origin: [{ workingTime: '090000' }], destination: [{ crs: 'KGX', tiploc: 'KNGX', workingTime: '112000' }] } },
  { locationDetail: { gbttBookedDeparture: '0930', origin: [{ workingTime: '091500' }], destination: [{ crs: 'KGX', tiploc: 'KNGX', workingTime: '101500' }] } },
  { locationDetail: { gbttBookedDeparture: '1050', origin: [{ workingTime: '103000' }], destination: [{ crs: 'KGX', tiploc: 'KNGX', workingTime: '113000' }] } }
    ];

  const chosen = pickNextService(services2, 'KNGX', { minAfterMinutes: 20, windowMinutes: 60, now });
    expect(chosen).toBeDefined();
    expect(chosen.locationDetail.gbttBookedDeparture).toBe('0930');
  });
});

describe('rttSearch', () => {
  test('calls fetch and returns json on ok', async () => {
    const fakeFetch = jest.fn(() => Promise.resolve({ ok: true, json: () => ({ services: [] }) }));
  const data = await rttSearch('search/CBG', 'KGX', '2025/10/18', { user: 'u', pass: 'p', fetchImpl: fakeFetch });
    expect(data).toEqual({ services: [] });
    expect(fakeFetch).toHaveBeenCalled();
  });

  test('throws on non-ok', async () => {
    const fakeFetch = jest.fn(() => Promise.resolve({ ok: false, status: 502 }));
  await expect(rttSearch('search/CBG','KGX','2025/10/18', { user: 'u', pass: 'p', fetchImpl: fakeFetch })).rejects.toThrow('RTT 502');
  });
});

describe('b64', () => {
  test('encodes credentials', () => {
    expect(b64('a','b')).toBe(Buffer.from('a:b').toString('base64'));
  });
});
