// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';

import { pickNextService } from '../../src/services/trainSelectionService.js';
import { hhmmToMins } from '../../src/utils/timeUtils.js';

const feature = loadFeature('./tests/bdd/features/train-selection.feature');

defineFeature(feature, (test) => {
  let currentTime;
  let trains;
  let selectedTrain;
  let searchOptions;

  // Helper to create a train service object
  const createTrain = (departure, arrival, destination = 'KNGX') => ({
    locationDetail: {
      gbttBookedDeparture: departure.replace(':', ''),
      origin: [{ workingTime: departure.replace(':', '') + '00' }],
      destination: [
        {
          tiploc: destination,
          publicTime: arrival.replace(':', ''),
          workingTime: arrival.replace(':', '') + '00',
        },
      ],
    },
  });

  test('Select earliest train within time window', ({ given, when, then }) => {
    given('the current time is 08:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 8, 0, 0);
    });

    given('I want to travel from Cambridge to Kings Cross', () => {
      // Context setup - destination will be 'KNGX'
    });

    given('the following trains are available:', (table) => {
      trains = table.map((row) => createTrain(row.departure, row.arrival, row.destination));
    });

    when(
      /I search for a train at least (\d+) minutes from now with a (\d+) minute window/,
      (minAfter, window) => {
        searchOptions = {
          now: currentTime,
          minAfterMinutes: parseInt(minAfter),
          windowMinutes: parseInt(window),
        };
        selectedTrain = pickNextService(trains, 'KNGX', searchOptions);
      }
    );

    then(/the system should select the (\d{2}:\d{2}) train/, (expectedTime) => {
      expect(selectedTrain).toBeDefined();
      const expectedDeparture = expectedTime.replace(':', '');
      expect(selectedTrain.locationDetail.gbttBookedDeparture).toBe(expectedDeparture);
    });
  });

  test('Exclude trains outside the time window', ({ given, when, then }) => {
    given('the current time is 08:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 8, 0, 0);
    });

    given('I want to travel from Cambridge to Kings Cross', () => {
      // Context setup
    });

    given('the following trains are available:', (table) => {
      trains = table.map((row) => createTrain(row.departure, row.arrival, row.destination));
    });

    when(
      /I search for a train at least (\d+) minutes from now with a (\d+) minute window/,
      (minAfter, window) => {
        searchOptions = {
          now: currentTime,
          minAfterMinutes: parseInt(minAfter),
          windowMinutes: parseInt(window),
        };
        selectedTrain = pickNextService(trains, 'KNGX', searchOptions);
      }
    );

    then(/the system should select the (\d{2}:\d{2}) train/, (expectedTime) => {
      expect(selectedTrain).toBeDefined();
      const expectedDeparture = expectedTime.replace(':', '');
      expect(selectedTrain.locationDetail.gbttBookedDeparture).toBe(expectedDeparture);
    });
  });

  test('Select fastest train when multiple options available', ({ given, when, then, and }) => {
    given('the current time is 08:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 8, 0, 0);
    });

    given('I want to travel from Cambridge to Kings Cross', () => {
      // Context setup
    });

    given('the following trains are available:', (table) => {
      trains = table.map((row) => createTrain(row.departure, row.arrival, row.destination));
    });

    when(
      /I search for a train at least (\d+) minutes from now with a (\d+) minute window/,
      (minAfter, window) => {
        searchOptions = {
          now: currentTime,
          minAfterMinutes: parseInt(minAfter),
          windowMinutes: parseInt(window),
        };
        selectedTrain = pickNextService(trains, 'KNGX', searchOptions);
      }
    );

    then(/the system should select the (\d{2}:\d{2}) train/, (expectedTime) => {
      expect(selectedTrain).toBeDefined();
      const expectedDeparture = expectedTime.replace(':', '');
      expect(selectedTrain.locationDetail.gbttBookedDeparture).toBe(expectedDeparture);
    });

    and(/it should arrive at (\d{2}:\d{2})/, (expectedArrival) => {
      const arrivalTime = expectedArrival.replace(':', '');
      expect(selectedTrain.locationDetail.destination[0].publicTime).toBe(arrivalTime);
    });
  });

  test('Handle next-day departure rollover', ({ given, when, then, and }) => {
    given('the current time is 23:50 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 23, 50, 0);
    });

    and('I want to travel from Cambridge to Kings Cross', () => {
      // Context setup
    });

    and('the following trains are available:', (table) => {
      trains = table.map((row) => createTrain(row.departure, row.arrival, row.destination));
    });

    when(
      /I search for a train at least (\d+) minutes from now with a (\d+) minute window/,
      (minAfter, window) => {
        searchOptions = {
          now: currentTime,
          minAfterMinutes: parseInt(minAfter),
          windowMinutes: parseInt(window),
        };
        selectedTrain = pickNextService(trains, 'KNGX', searchOptions);
      }
    );

    then(/the system should select the (\d{2}:\d{2}) train/, (expectedTime) => {
      expect(selectedTrain).toBeDefined();
      const expectedDeparture = expectedTime.replace(':', '');
      expect(selectedTrain.locationDetail.gbttBookedDeparture).toBe(expectedDeparture);
    });

    and("it should be treated as tomorrow's service", () => {
      // The train at 00:10 should be selected even though it's numerically less than 23:50
      const depMins = hhmmToMins(selectedTrain.locationDetail.gbttBookedDeparture);
      expect(depMins).toBe(10); // 00:10 = 10 minutes
    });
  });

  test('No suitable trains available', ({ given, when, then, and }) => {
    given('the current time is 08:00 UK local time', () => {
      currentTime = new Date(2025, 10, 30, 8, 0, 0);
    });

    given('I want to travel from Cambridge to Kings Cross', () => {
      // Context setup
    });

    given('the following trains are available:', (table) => {
      trains = table.map((row) => createTrain(row.departure, row.arrival, row.destination));
    });

    when(
      /I search for a train at least (\d+) minutes from now with a (\d+) minute window/,
      (minAfter, window) => {
        searchOptions = {
          now: currentTime,
          minAfterMinutes: parseInt(minAfter),
          windowMinutes: parseInt(window),
        };
        selectedTrain = pickNextService(trains, 'KNGX', searchOptions);
      }
    );

    then('no train should be selected', () => {
      expect(selectedTrain).toBeUndefined();
    });

    and('the status should be "UNKNOWN"', () => {
      // This would be handled by the train status service
      // which returns UNKNOWN when no train is selected
      expect(selectedTrain).toBeUndefined();
    });
  });
});
