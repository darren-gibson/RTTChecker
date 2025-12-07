// @ts-nocheck
import { pickNextService } from '../../../src/services/trainSelectionService.js';

// Helper to format minutes since midnight as HHmm
const formatTime = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return String(h).padStart(2, '0') + String(m).padStart(2, '0');
};

describe('pickNextService', () => {
  test('picks first service after given time', () => {
    // Use current time and create relative train times to avoid timezone issues
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    // Create trains at: now + 10min, now + 30min, now + 60min
    const train1Time = nowMins + 10;
    const train2Time = nowMins + 30;
    const train3Time = nowMins + 60;

    const services = [
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
            { crs: 'KGX', tiploc: 'KNGX', workingTime: formatTime(train2Time + 60) + '00' },
          ],
        },
      },
      {
        locationDetail: {
          gbttBookedDeparture: formatTime(train3Time),
          origin: [{ workingTime: formatTime(train3Time) + '00' }],
          destination: [
            { crs: 'KGX', tiploc: 'KNGX', workingTime: formatTime(train3Time + 60) + '00' },
          ],
        },
      },
    ];

    const chosen = pickNextService(services, 'KNGX', {
      minAfterMinutes: 0,
      windowMinutes: 120,
      now,
    });
    expect(chosen).toBeDefined();
    expect(chosen.locationDetail.gbttBookedDeparture).toBe(formatTime(train1Time));
  });

  test('selects next fastest train at least 20 minutes from now and within next hour', () => {
    // Use current time and create relative train times to avoid timezone issues
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    // Create train times relative to current time
    // Train 1: 5 mins from now (too early - outside minAfter window of 20)
    // Train 2: 25 mins from now (within window [20, 80], earliest)
    // Train 3: 90 mins from now (outside window - too late, beyond 80 mins)
    const train1Time = nowMins + 5;
    const train2Time = nowMins + 25;
    const train3Time = nowMins + 90;

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
