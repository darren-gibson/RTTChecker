import { defineFeature, loadFeature } from 'jest-cucumber';

import { getTrainStatus } from '../../src/services/trainStatusService.js';
import { TrainStatus } from '../../src/constants.js';

const feature = loadFeature('./tests/bdd/features/train-status.feature');

defineFeature(feature, (test) => {
  let currentTime;
  let trainData;
  let result;

  const createMockTrain = (scheduledDep, realtimeDep, cancelled = false) => {
    const train = {
      locationDetail: {
        gbttBookedDeparture: scheduledDep,
        realtimeDeparture: realtimeDep,
        origin: [{ workingTime: scheduledDep + '00' }],
        destination: [
          {
            tiploc: 'KNGX',
            description: 'Kings Cross',
            publicTime: '1400',
            workingTime: '140000',
          },
        ],
      },
      trainIdentity: 'TEST123',
    };

    if (cancelled) {
      train.locationDetail.displayAs = 'CANCELLED_CALL';
      train.locationDetail.cancelReasonCode = 'M8';
    }

    return train;
  };

  const createMockFetch = (services) => {
    return async () => ({
      ok: true,
      json: async () => ({
        services,
        location: { tiploc: 'CAMBDGE' },
      }),
    });
  };

  test('Train running on time', ({ given, when, then, and }) => {
    given('I am checking train status from Cambridge to Kings Cross', () => {
      // Context setup
    });

    given('the current time is 12:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 12, 0, 0);
    });

    given('a train is scheduled to depart at 12:22', () => {
      trainData = { scheduled: '1222' };
    });

    given('the realtime departure is 12:22', () => {
      trainData.realtime = '1222';
    });

    when('I check the train status', async () => {
      const train = createMockTrain(trainData.scheduled, trainData.realtime);
      const mockFetch = createMockFetch([train]);

      result = await getTrainStatus({
        originTiploc: 'CAMBDGE',
        destTiploc: 'KNGX',
        minAfterMinutes: 20,
        windowMinutes: 60,
        now: currentTime,
        fetchImpl: mockFetch,
      });
    });

    then('the status should be "ON_TIME"', () => {
      expect(result.status).toBe(TrainStatus.ON_TIME);
    });

    and('the assessment should be "good"', () => {
      // ON_TIME status indicates good service
      expect(result.status).toBe(TrainStatus.ON_TIME);
    });
  });

  test('On time when delayMinutes is exactly 0', ({ given, when, then }) => {
    given('I am checking train status from Cambridge to Kings Cross', () => {});
    given('the current time is 12:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 12, 0, 0);
    });
    given('a train is scheduled to depart at 12:22', () => {
      trainData = { scheduled: '1222' };
    });
    given('the realtime departure is also 12:22', () => {
      trainData.realtime = '1222';
    });
    when('I check the train status', async () => {
      const train = createMockTrain(trainData.scheduled, trainData.realtime);
      const mockFetch = createMockFetch([train]);

      result = await getTrainStatus({
        originTiploc: 'CAMBDGE',
        destTiploc: 'KNGX',
        minAfterMinutes: 20,
        windowMinutes: 60,
        now: currentTime,
        fetchImpl: mockFetch,
      });
    });
    then('the status should be "ON_TIME"', () => {
      expect(result.status).toBe(TrainStatus.ON_TIME);
    });
  });

  test('Assume on time when realtime is missing', ({ given, when, then }) => {
    given('I am checking train status from Cambridge to Kings Cross', () => {});
    given('the current time is 12:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 12, 0, 0);
    });
    given('the realtime data is missing', () => {
      trainData = { scheduled: '1222', realtime: null };
    });
    when('I check the train status', async () => {
      const train = createMockTrain(trainData.scheduled, trainData.realtime);
      const mockFetch = createMockFetch([train]);

      result = await getTrainStatus({
        originTiploc: 'CAMBDGE',
        destTiploc: 'KNGX',
        minAfterMinutes: 20,
        windowMinutes: 60,
        now: currentTime,
        fetchImpl: mockFetch,
      });
    });
    then('the status should be "ON_TIME"', () => {
      expect(result.status).toBe(TrainStatus.ON_TIME);
    });
  });

  test('Early departure within on-time threshold (2 minutes)', ({ given, when, then }) => {
    given('I am checking train status from Cambridge to Kings Cross', () => {});
    given('the current time is 12:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 12, 0, 0);
    });
    given('a train is scheduled to depart at 12:22', () => {
      trainData = { scheduled: '1222' };
    });
    given('the realtime departure is 12:20', () => {
      trainData.realtime = '1220';
    });
    when('I check the train status', async () => {
      const train = createMockTrain(trainData.scheduled, trainData.realtime);
      const mockFetch = createMockFetch([train]);

      result = await getTrainStatus({
        originTiploc: 'CAMBDGE',
        destTiploc: 'KNGX',
        minAfterMinutes: 20,
        windowMinutes: 60,
        now: currentTime,
        fetchImpl: mockFetch,
      });
    });
    then('the status should be "ON_TIME"', () => {
      expect(result.status).toBe(TrainStatus.ON_TIME);
    });
  });

  test('Exactly at on-time boundary (2 minutes late)', ({ given, when, then }) => {
    given('I am checking train status from Cambridge to Kings Cross', () => {});
    given('the current time is 12:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 12, 0, 0);
    });
    given('a train is scheduled to depart at 12:22', () => {
      trainData = { scheduled: '1222' };
    });
    given('the realtime departure is 12:24', () => {
      trainData.realtime = '1224';
    });
    when('I check the train status', async () => {
      const train = createMockTrain(trainData.scheduled, trainData.realtime);
      const mockFetch = createMockFetch([train]);

      result = await getTrainStatus({
        originTiploc: 'CAMBDGE',
        destTiploc: 'KNGX',
        minAfterMinutes: 20,
        windowMinutes: 60,
        now: currentTime,
        fetchImpl: mockFetch,
      });
    });
    then('the status should be "ON_TIME"', () => {
      expect(result.status).toBe(TrainStatus.ON_TIME);
    });
  });

  test('Exactly minor delay boundary (5 minutes late)', ({ given, when, then }) => {
    given('I am checking train status from Cambridge to Kings Cross', () => {});
    given('the current time is 12:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 12, 0, 0);
    });
    given('a train is scheduled to depart at 12:22', () => {
      trainData = { scheduled: '1222' };
    });
    given('the realtime departure is 12:27', () => {
      trainData.realtime = '1227';
    });
    when('I check the train status', async () => {
      const train = createMockTrain(trainData.scheduled, trainData.realtime);
      const mockFetch = createMockFetch([train]);

      result = await getTrainStatus({
        originTiploc: 'CAMBDGE',
        destTiploc: 'KNGX',
        minAfterMinutes: 20,
        windowMinutes: 60,
        now: currentTime,
        fetchImpl: mockFetch,
      });
    });
    then('the status should be "MINOR_DELAY"', () => {
      expect(result.status).toBe(TrainStatus.MINOR_DELAY);
    });
  });

  test('Exactly delayed boundary (10 minutes late)', ({ given, when, then }) => {
    given('I am checking train status from Cambridge to Kings Cross', () => {});
    given('the current time is 12:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 12, 0, 0);
    });
    given('a train is scheduled to depart at 12:22', () => {
      trainData = { scheduled: '1222' };
    });
    given('the realtime departure is 12:32', () => {
      trainData.realtime = '1232';
    });
    when('I check the train status', async () => {
      const train = createMockTrain(trainData.scheduled, trainData.realtime);
      const mockFetch = createMockFetch([train]);

      result = await getTrainStatus({
        originTiploc: 'CAMBDGE',
        destTiploc: 'KNGX',
        minAfterMinutes: 20,
        windowMinutes: 60,
        now: currentTime,
        fetchImpl: mockFetch,
      });
    });
    then('the status should be "DELAYED"', () => {
      expect(result.status).toBe(TrainStatus.DELAYED);
    });
  });

  test('Train with minor delay (1-5 minutes)', ({ given, when, then, and }) => {
    given('I am checking train status from Cambridge to Kings Cross', () => {
      // Context setup
    });

    given('the current time is 12:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 12, 0, 0);
    });

    given('a train is scheduled to depart at 12:22', () => {
      trainData = { scheduled: '1222' };
    });

    given('the realtime departure is 12:26', () => {
      trainData.realtime = '1226';
    });

    when('I check the train status', async () => {
      const train = createMockTrain(trainData.scheduled, trainData.realtime);
      const mockFetch = createMockFetch([train]);

      result = await getTrainStatus({
        originTiploc: 'CAMBDGE',
        destTiploc: 'KNGX',
        minAfterMinutes: 20,
        windowMinutes: 60,
        now: currentTime,
        fetchImpl: mockFetch,
      });
    });

    then('the status should be "MINOR_DELAY"', () => {
      expect(result.status).toBe(TrainStatus.MINOR_DELAY);
    });

    and('the delay should be 4 minutes', () => {
      // Delay is calculated from scheduled vs realtime
      const scheduledMins = 12 * 60 + 22;
      const realtimeMins = 12 * 60 + 26;
      const delay = realtimeMins - scheduledMins;
      expect(delay).toBe(4);
    });

    and('the assessment should be "acceptable"', () => {
      expect(result.status).toBe(TrainStatus.MINOR_DELAY);
    });
  });

  test('Train with moderate delay (6-10 minutes)', ({ given, when, then, and }) => {
    given('I am checking train status from Cambridge to Kings Cross', () => {
      // Context setup
    });

    given('the current time is 12:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 12, 0, 0);
    });

    given('a train is scheduled to depart at 12:22', () => {
      trainData = { scheduled: '1222' };
    });

    given('the realtime departure is 12:30', () => {
      trainData.realtime = '1230';
    });

    when('I check the train status', async () => {
      const train = createMockTrain(trainData.scheduled, trainData.realtime);
      const mockFetch = createMockFetch([train]);

      result = await getTrainStatus({
        originTiploc: 'CAMBDGE',
        destTiploc: 'KNGX',
        minAfterMinutes: 20,
        windowMinutes: 60,
        now: currentTime,
        fetchImpl: mockFetch,
      });
    });

    then('the status should be "DELAYED"', () => {
      expect(result.status).toBe(TrainStatus.DELAYED);
    });

    and('the delay should be 8 minutes', () => {
      const scheduledMins = 12 * 60 + 22;
      const realtimeMins = 12 * 60 + 30;
      const delay = realtimeMins - scheduledMins;
      expect(delay).toBe(8);
    });

    and('the assessment should be "concerning"', () => {
      expect(result.status).toBe(TrainStatus.DELAYED);
    });
  });

  test('Train with major delay (over 10 minutes)', ({ given, when, then, and }) => {
    given('I am checking train status from Cambridge to Kings Cross', () => {
      // Context setup
    });

    given('the current time is 12:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 12, 0, 0);
    });

    given('a train is scheduled to depart at 14:10', () => {
      trainData = { scheduled: '1410' };
    });

    given('the realtime departure is 14:22', () => {
      trainData.realtime = '1422';
    });

    when('I check the train status', async () => {
      const train = createMockTrain(trainData.scheduled, trainData.realtime);
      const mockFetch = createMockFetch([train]);

      result = await getTrainStatus({
        originTiploc: 'CAMBDGE',
        destTiploc: 'KNGX',
        minAfterMinutes: 120,
        windowMinutes: 60,
        now: currentTime,
        fetchImpl: mockFetch,
      });
    });

    then('the status should be "MAJOR_DELAY"', () => {
      expect(result.status).toBe(TrainStatus.MAJOR_DELAY);
    });

    and('the delay should be 12 minutes', () => {
      const scheduledMins = 14 * 60 + 10;
      const realtimeMins = 14 * 60 + 22;
      const delay = realtimeMins - scheduledMins;
      expect(delay).toBe(12);
    });

    and('the assessment should be "poor"', () => {
      expect(result.status).toBe(TrainStatus.MAJOR_DELAY);
    });
  });

  test('Cancelled train', ({ given, when, then, and }) => {
    given('I am checking train status from Cambridge to Kings Cross', () => {
      // Context setup
    });

    given('the current time is 12:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 12, 0, 0);
    });

    given('a train is scheduled to depart at 13:13', () => {
      trainData = { scheduled: '1313' };
    });

    given('the train is marked as cancelled', () => {
      trainData.cancelled = true;
    });

    when('I check the train status', async () => {
      const train = createMockTrain(trainData.scheduled, trainData.scheduled, true);
      const mockFetch = createMockFetch([train]);

      result = await getTrainStatus({
        originTiploc: 'CAMBDGE',
        destTiploc: 'KNGX',
        minAfterMinutes: 60,
        windowMinutes: 60,
        now: currentTime,
        fetchImpl: mockFetch,
      });
    });

    then('the status should be "MAJOR_DELAY"', () => {
      expect(result.status).toBe(TrainStatus.MAJOR_DELAY);
    });

    and('the assessment should be "very poor"', () => {
      expect(result.status).toBe(TrainStatus.MAJOR_DELAY);
    });

    and('the display should show "CANCELLED_CALL"', () => {
      expect(result.selected.locationDetail.displayAs).toBe('CANCELLED_CALL');
    });
  });

  test('Unknown status when no suitable train found', ({ given, when, then, and }) => {
    given('I am checking train status from Cambridge to Kings Cross', () => {
      // Context setup
    });

    given('the current time is 12:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 12, 0, 0);
    });

    given('no trains match my criteria', () => {
      trainData = [];
    });

    when('I check the train status', async () => {
      const mockFetch = createMockFetch([]);

      result = await getTrainStatus({
        originTiploc: 'CAMBDGE',
        destTiploc: 'KNGX',
        minAfterMinutes: 20,
        windowMinutes: 60,
        now: currentTime,
        fetchImpl: mockFetch,
      });
    });

    then('the status should be "UNKNOWN"', () => {
      expect(result.status).toBe(TrainStatus.UNKNOWN);
    });

    and('no train should be selected', () => {
      expect(result.selected).toBeNull();
    });
  });
});
