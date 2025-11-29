import { pickNextService } from '../../../src/services/trainSelectionService.js';

describe('pickNextService', () => {
  test('picks first service after given time', () => {
    const services = [
      { locationDetail: { gbttBookedDeparture: '0900', origin: [{ workingTime: '085000' }], destination: [{ crs: 'KGX', tiploc: 'KNGX', workingTime: '100000' }] } },
      { locationDetail: { gbttBookedDeparture: '0930', origin: [{ workingTime: '091500' }], destination: [{ crs: 'KGX', tiploc: 'KNGX', workingTime: '103000' }] } },
      { locationDetail: { gbttBookedDeparture: '1000', origin: [{ workingTime: '094500' }], destination: [{ crs: 'KGX', tiploc: 'KNGX', workingTime: '110000' }] } }
    ];
    const now = new Date('2025-10-17T08:00:00Z'); // 9:00 BST
    const chosen = pickNextService(services, 'KNGX', { minAfterMinutes: 0, windowMinutes: 120, now });
    expect(chosen).toBeDefined();
    expect(chosen.locationDetail.gbttBookedDeparture).toBe('0900');
  });

  test('selects next fastest train at least 20 minutes from now and within next hour', () => {
    // Now is 09:00 UTC = 10:00 BST
    const now = new Date('2025-10-17T09:00:00Z');

    // create services: one departing at 09:25 (25 mins from 10:00 BST = outside window)
    // another departing at 09:30 (30 mins, but also outside the 1h window from 10:00 BST)
    // another departing at 10:50 (50 mins from 10:00 BST, within window)
    const services2 = [
      { locationDetail: { gbttBookedDeparture: '0925', origin: [{ workingTime: '090000' }], destination: [{ crs: 'KGX', tiploc: 'KNGX', workingTime: '112000' }] } },
      { locationDetail: { gbttBookedDeparture: '0930', origin: [{ workingTime: '091500' }], destination: [{ crs: 'KGX', tiploc: 'KNGX', workingTime: '101500' }] } },
      { locationDetail: { gbttBookedDeparture: '1050', origin: [{ workingTime: '103000' }], destination: [{ crs: 'KGX', tiploc: 'KNGX', workingTime: '113000' }] } }
    ];

    const chosen = pickNextService(services2, 'KNGX', { minAfterMinutes: 20, windowMinutes: 60, now });
    expect(chosen).toBeDefined();
    expect(chosen.locationDetail.gbttBookedDeparture).toBe('1050');
  });
});
