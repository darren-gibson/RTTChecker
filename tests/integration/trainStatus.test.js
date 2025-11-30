import fs from 'fs';
import path from 'path';

import { getTrainStatus } from '../../src/services/trainStatusService.js';
import { TrainStatus } from '../../src/constants.js';

/**
 * Create a Date object representing a UK local time, regardless of system timezone.
 * Since train times in API responses are in UK local time (GMT/BST), we need tests
 * to work consistently across different server timezones.
 * @param {number} year - Full year
 * @param {number} month - Month (0-11)
 * @param {number} day - Day of month
 * @param {number} hour - Hour in UK local time (0-23)
 * @param {number} minute - Minute (0-59)
 * @returns {Date} Date object where getHours()/getMinutes() return the UK local time
 */
function createUKLocalDate(year, month, day, hour, minute) {
  // Create a date string that will be interpreted as local time
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  return new Date(dateStr);
}

describe('Integration tests - getTrainStatus with real data', () => {
  test('normalCommute.json: at 06:05 BST selects 06:39 train as earliest arrival after offset', async () => {
    const file = path.join(__dirname, '../examples', 'normalCommute.json');
    const json = fs.readFileSync(file, 'utf8');
    const fetchMock = async () => ({ ok: true, json: async () => JSON.parse(json) });

    // Simulate current time at 06:05 UK local time (BST in October)
    const now = createUKLocalDate(2025, 9, 20, 6, 5); // 06:05 UK local

    const result = await getTrainStatus({
      originTiploc: 'CAMBDGE',
      destTiploc: 'KNGX',
      minAfterMinutes: 20,
      windowMinutes: 60,
      now,
      fetchImpl: fetchMock,
    });

    // Should select the 06:39 train (arrives at KNGX at 07:32, earliest after offset)
    expect(result.selected).toBeDefined();
    expect(result.selected.locationDetail.gbttBookedDeparture).toBe('0639');
    expect(result.selected.locationDetail.destination[0].tiploc).toBe('KNGX');
    expect(result.selected.locationDetail.destination[0].publicTime).toBe('0732');
    // Should be on time (or update as needed)
    expect(result.status).toBe(TrainStatus.ON_TIME);
  });
  test('runningOnTime.json: at 12:20 selects 13:22 train running on time -> good', async () => {
    // Load the real API response example
    const file = path.join(__dirname, '../examples', 'runningOnTime.json');
    const json = fs.readFileSync(file, 'utf8');

    // Mock fetch to return the local JSON data
    const fetchMock = async () => ({
      ok: true,
      json: async () => JSON.parse(json),
    });

    // Simulate current time at 12:20 UK local time
    const now = createUKLocalDate(2025, 9, 19, 12, 20); // 12:20 UK local

    // Call getTrainStatus with the mocked fetch and simulated time
    const result = await getTrainStatus({
      originTiploc: 'CAMBDGE',
      destTiploc: 'KNGX',
      minAfterMinutes: 20,
      windowMinutes: 60,
      now,
      fetchImpl: fetchMock,
    });

    // Verify the selected train
    expect(result.selected).toBeDefined();
    expect(result.selected.locationDetail.gbttBookedDeparture).toBe('1322');
    expect(result.selected.trainIdentity).toBe('1T31');

    // Verify the status is 'on time' (running on time)
    expect(result.status).toBe(TrainStatus.ON_TIME);
  });

  test('runningOnTime.json: with narrow 10 min window selects fastest available train', async () => {
    const file = path.join(__dirname, '../examples', 'runningOnTime.json');
    const json = fs.readFileSync(file, 'utf8');
    const fetchMock = async () => ({ ok: true, json: async () => JSON.parse(json) });

    // Simulate current time at 12:20 UK local time
    const now = createUKLocalDate(2025, 9, 19, 12, 20); // 12:20 UK local

    const result = await getTrainStatus({
      originTiploc: 'CAMBDGE',
      destTiploc: 'KNGX',
      minAfterMinutes: 5,
      windowMinutes: 10,
      now,
      fetchImpl: fetchMock,
    });

    expect(result.selected).toBeDefined();
    // Should select the fastest train within the 10-minute window
    expect(result.selected.locationDetail.gbttBookedDeparture).toBe('1228');
    expect(result.selected.trainIdentity).toBe('1C33');
  });

  test('cancelledTrain.json: cancelled train at 13:13 -> very poor', async () => {
    const file = path.join(__dirname, '../examples', 'cancelledTrain.json');
    const json = fs.readFileSync(file, 'utf8');
    const fetchMock = async () => ({ ok: true, json: async () => JSON.parse(json) });

    // Simulate current time at 13:00 UK local time
    const now = createUKLocalDate(2025, 9, 19, 13, 0); // 13:00 UK local

    const result = await getTrainStatus({
      originTiploc: 'KNGX',
      destTiploc: 'PBRO',
      minAfterMinutes: 5,
      windowMinutes: 30,
      now,
      fetchImpl: fetchMock,
    });

    expect(result.selected).toBeDefined();
    expect(result.selected.locationDetail.gbttBookedDeparture).toBe('1313');
    expect(result.selected.locationDetail.displayAs).toBe('CANCELLED_CALL');

    // Cancelled trains should be marked as 'major delay'
    expect(result.status).toBe(TrainStatus.MAJOR_DELAY);
  });

  test('No matching service returns unknown status', async () => {
    const file = path.join(__dirname, '../examples', 'runningOnTime.json');
    const json = fs.readFileSync(file, 'utf8');
    const fetchMock = async () => ({ ok: true, json: async () => JSON.parse(json) });

    // Simulate current time at 12:20 UK local time
    const now = createUKLocalDate(2025, 9, 19, 12, 20); // 12:20 UK local

    // Request with impossible time window (way in the future)
    const result = await getTrainStatus({
      originTiploc: 'CAMBDGE',
      destTiploc: 'KNGX',
      minAfterMinutes: 500, // 500 minutes in the future
      windowMinutes: 10,
      now,
      fetchImpl: fetchMock,
    });

    expect(result.selected).toBeNull();
    expect(result.status).toBe(TrainStatus.UNKNOWN);
  });

  test('lateTrain.json: 14:10 train running 12 minutes late -> major delay', async () => {
    const file = path.join(__dirname, '../lateTrain.json');
    const json = fs.readFileSync(file, 'utf8');
    const fetchMock = async () => ({ ok: true, json: async () => JSON.parse(json) });

    // Simulate current time at 14:00 UK local time (1 hour before scheduled departure)
    const now = createUKLocalDate(2025, 9, 19, 14, 0); // 14:00 UK local

    const result = await getTrainStatus({
      originTiploc: 'SHEFFLD',
      destTiploc: 'CLTHRPS',
      minAfterMinutes: 5,
      windowMinutes: 60,
      now,
      fetchImpl: fetchMock,
    });

    // Verify the selected train
    expect(result.selected).toBeDefined();
    expect(result.selected.locationDetail.gbttBookedDeparture).toBe('1410');
    expect(result.selected.locationDetail.realtimeDeparture).toBe('1422');
    expect(result.selected.trainIdentity).toBe('1B78');

    // Verify the status - 12 minutes late (calculated from 1410 booked vs 1422 realtime) should be 'major delay' (>10 mins)
    expect(result.status).toBe(TrainStatus.MAJOR_DELAY);
  });
});
