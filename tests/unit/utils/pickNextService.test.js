import { pickNextService } from '../../../src/services/trainSelectionService.js';

describe('pickNextService', () => {
  test('picks first service after given time', () => {
    const services = [
      {
        locationDetail: {
          gbttBookedDeparture: '0900',
          origin: [{ workingTime: '085000' }],
          destination: [{ crs: 'KGX', tiploc: 'KNGX', workingTime: '100000' }],
        },
      },
      {
        locationDetail: {
          gbttBookedDeparture: '0930',
          origin: [{ workingTime: '091500' }],
          destination: [{ crs: 'KGX', tiploc: 'KNGX', workingTime: '103000' }],
        },
      },
      {
        locationDetail: {
          gbttBookedDeparture: '1000',
          origin: [{ workingTime: '094500' }],
          destination: [{ crs: 'KGX', tiploc: 'KNGX', workingTime: '110000' }],
        },
      },
    ];
    const now = new Date('2025-10-17T08:00:00Z'); // 9:00 BST
    const chosen = pickNextService(services, 'KNGX', {
      minAfterMinutes: 0,
      windowMinutes: 120,
      now,
    });
    expect(chosen).toBeDefined();
    expect(chosen.locationDetail.gbttBookedDeparture).toBe('0900');
  });

  test('selects next fastest train at least 20 minutes from now and within next hour', () => {
    // Use current date/time to avoid timezone issues
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Create train times relative to current time
    // Train 1: 5 mins from now (too early - outside minAfter window)
    // Train 2: 25 mins from now (within window, earliest)
    // Train 3: 70 mins from now (outside window - too late)
    const train1Time = currentHour * 60 + currentMin + 5;
    const train2Time = currentHour * 60 + currentMin + 25;
    const train3Time = currentHour * 60 + currentMin + 70;

    const formatTime = (mins) => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      return String(h).padStart(2, '0') + String(m).padStart(2, '0');
    };

    const services2 = [
      {
        locationDetail: {
          gbttBookedDeparture: formatTime(train1Time),
          origin: [{ workingTime: formatTime(train1Time) + '00' }],
          destination: [
            { crs: 'KGX', tiploc: 'KNGX', workingTime: formatTime(train1Time + 60) + '00' },
          ],
        },
      },
      {
        locationDetail: {
          gbttBookedDeparture: formatTime(train2Time),
          origin: [{ workingTime: formatTime(train2Time) + '00' }],
          destination: [
            { crs: 'KGX', tiploc: 'KNGX', workingTime: formatTime(train2Time + 50) + '00' },
          ],
        },
      },
      {
        locationDetail: {
          gbttBookedDeparture: formatTime(train3Time),
          origin: [{ workingTime: formatTime(train3Time) + '00' }],
          destination: [
            { crs: 'KGX', tiploc: 'KNGX', workingTime: formatTime(train3Time + 40) + '00' },
          ],
        },
      },
    ];

    const chosen = pickNextService(services2, 'KNGX', {
      minAfterMinutes: 20,
      windowMinutes: 60,
      now,
    });
    expect(chosen).toBeDefined();
    expect(chosen.locationDetail.gbttBookedDeparture).toBe(formatTime(train2Time));
  });
});
