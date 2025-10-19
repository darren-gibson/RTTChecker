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
    { locationDetail: { gbttBookedDeparture: '0600' } },
    { locationDetail: { gbttBookedDeparture: '0730' } },
    { locationDetail: { gbttBookedDeparture: '0900' } }
  ];

  test('picks first service after given time', () => {
    expect(pickNextService(services, '0700').locationDetail.gbttBookedDeparture).toBe('0730');
    expect(pickNextService(services, '0000').locationDetail.gbttBookedDeparture).toBe('0600');
    expect(pickNextService(services, '1000')).toBeUndefined();
  });
});

describe('rttSearch', () => {
  test('calls fetch and returns json on ok', async () => {
    const fakeFetch = jest.fn(() => Promise.resolve({ ok: true, json: () => ({ services: [] }) }));
    const data = await rttSearch('search/CBG', '2025/10/18', { user: 'u', pass: 'p', fetchImpl: fakeFetch });
    expect(data).toEqual({ services: [] });
    expect(fakeFetch).toHaveBeenCalled();
  });

  test('throws on non-ok', async () => {
    const fakeFetch = jest.fn(() => Promise.resolve({ ok: false, status: 502 }));
    await expect(rttSearch('search/CBG','2025/10/18', { user: 'u', pass: 'p', fetchImpl: fakeFetch })).rejects.toThrow('RTT 502');
  });
});

describe('b64', () => {
  test('encodes credentials', () => {
    expect(b64('a','b')).toBe(Buffer.from('a:b').toString('base64'));
  });
});
