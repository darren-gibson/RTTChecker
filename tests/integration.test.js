import fs from 'fs';
import path from 'path';
import { getTrainStatus } from '../index.js';

describe('Integration tests - getTrainStatus with real data', () => {
  test('runningOnTime.json: at 12:20 selects 13:22 train running on time -> good', async () => {
    // Load the real API response example
    const file = path.join(__dirname, 'examples', 'runningOnTime.json');
    const json = fs.readFileSync(file, 'utf8');

    // Mock fetch to return the local JSON data
    const fetchMock = async () => ({
      ok: true,
      json: async () => JSON.parse(json)
    });

    // Simulate current time at 12:20 BST
    const now = new Date('2025-10-19T11:20:00Z'); // 12:20 BST (UTC+1)

    // Call getTrainStatus with the mocked fetch and simulated time
    const result = await getTrainStatus({
      originTiploc: 'CAMBDGE',
      destTiploc: 'KNGX',
      minAfterMinutes: 20,
      windowMinutes: 60,
      now,
      fetchImpl: fetchMock
    });

    // Verify the selected train
    expect(result.selected).toBeDefined();
    expect(result.selected.locationDetail.gbttBookedDeparture).toBe('1322');
    expect(result.selected.trainIdentity).toBe('1T31');
    
    // Verify the lateness state is 'good' (running on time)
    expect(result.lateness).toBe('good');
  });

  test('runningOnTime.json: with narrow 10 min window selects fastest available train', async () => {
    const file = path.join(__dirname, 'examples', 'runningOnTime.json');
    const json = fs.readFileSync(file, 'utf8');
    const fetchMock = async () => ({ ok: true, json: async () => JSON.parse(json) });

    // Simulate current time at 12:20 BST
    const now = new Date('2025-10-19T11:20:00Z'); // 12:20 BST (UTC+1)

    const result = await getTrainStatus({
      originTiploc: 'CAMBDGE',
      destTiploc: 'KNGX',
      minAfterMinutes: 5,
      windowMinutes: 10,
      now,
      fetchImpl: fetchMock
    });

    expect(result.selected).toBeDefined();
    // Should select the fastest train within the 10-minute window
    expect(result.selected.locationDetail.gbttBookedDeparture).toBe('1228');
    expect(result.selected.trainIdentity).toBe('1C33');
  });

  test('cancelledTrain.json: cancelled train at 13:13 -> very poor', async () => {
    const file = path.join(__dirname, 'examples', 'cancelledTrain.json');
    const json = fs.readFileSync(file, 'utf8');
    const fetchMock = async () => ({ ok: true, json: async () => JSON.parse(json) });

    // Simulate current time at 13:00 BST
    const now = new Date('2025-10-19T12:00:00Z'); // 13:00 BST (UTC+1)

    const result = await getTrainStatus({
      originTiploc: 'KNGX',
      destTiploc: 'PBRO',
      minAfterMinutes: 5,
      windowMinutes: 30,
      now,
      fetchImpl: fetchMock
    });

    expect(result.selected).toBeDefined();
    expect(result.selected.locationDetail.gbttBookedDeparture).toBe('1313');
    expect(result.selected.locationDetail.displayAs).toBe('CANCELLED_CALL');
    
    // Cancelled trains should be marked as 'very poor'
    expect(result.lateness).toBe('very poor');
  });

  test('No matching service returns unknown lateness', async () => {
    const file = path.join(__dirname, 'examples', 'runningOnTime.json');
    const json = fs.readFileSync(file, 'utf8');
    const fetchMock = async () => ({ ok: true, json: async () => JSON.parse(json) });

    // Simulate current time at 12:20 BST
    const now = new Date('2025-10-19T11:20:00Z'); // 12:20 BST (UTC+1)

    // Request with impossible time window (way in the future)
    const result = await getTrainStatus({
      originTiploc: 'CAMBDGE',
      destTiploc: 'KNGX',
      minAfterMinutes: 500,  // 500 minutes in the future
      windowMinutes: 10,
      now,
      fetchImpl: fetchMock
    });

    expect(result.selected).toBeNull();
    expect(result.lateness).toBe('unknown');
  });
});
