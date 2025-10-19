import request from 'supertest';
import { app } from '../index.js';
import { GoogleHomeApi, AirQualityState } from '../src/constants.js';
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Mock node-fetch to avoid real API calls
jest.mock('node-fetch');

// Helper to create a mock fetch response
const mockFetchResponse = (data) => {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data)
  });
};

// Helper to load test data files
const loadTestData = (filename) => {
  const path = resolve(process.cwd(), 'tests', filename);
  return JSON.parse(readFileSync(path, 'utf-8'));
};

describe('Google Home Smart Home API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /smarthome', () => {
    describe('SYNC Intent', () => {
      it('should return device metadata when SYNC intent is received', async () => {
        const syncRequest = {
          requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
          inputs: [{
            intent: GoogleHomeApi.Intent.SYNC
          }]
        };

        const response = await request(app)
          .post('/smarthome')
          .send(syncRequest)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body).toEqual({
          requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
          payload: {
            agentUserId: 'user-123',
            devices: [{
              id: 'train_1',
              type: 'action.devices.types.SENSOR',
              traits: ['action.devices.traits.SensorState'],
              name: { name: 'My Train' },
              willReportState: true,
              attributes: {
                sensorStatesSupported: [{
                  name: 'AirQuality',
                  descriptiveCapabilities: {
                    availableStates: ['good', 'fair', 'poor', 'very poor', 'unknown']
                  }
                }]
              }
            }]
          }
        });
      });

      it('should use configuration values for device metadata', async () => {
        const syncRequest = {
          requestId: 'test-request-123',
          inputs: [{ intent: GoogleHomeApi.Intent.SYNC }]
        };

        const response = await request(app)
          .post('/smarthome')
          .send(syncRequest)
          .expect(200);

        const device = response.body.payload.devices[0];
        expect(device.id).toBe('train_1');
        expect(device.name.name).toBe('My Train');
      });
    });

    describe('QUERY Intent', () => {
      it('should return GOOD air quality when train is on time', async () => {
        // Load real API response for on-time train
        const runningOnTime = loadTestData('examples/runningOnTime.json');

        // Mock fetch to return the on-time train data
        fetch.mockImplementation(() => mockFetchResponse(runningOnTime));

        const queryRequest = {
          requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
          inputs: [{
            intent: GoogleHomeApi.Intent.QUERY,
            payload: {
              devices: [{
                id: 'train_1'
              }]
            }
          }]
        };

        const response = await request(app)
          .post('/smarthome')
          .send(queryRequest)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body).toEqual({
          requestId: 'ff36a3cc-ec34-11e6-b1a0-64510650abcf',
          payload: {
            devices: {
              train_1: {
                status: 'SUCCESS',
                online: true,
                currentSensorStateData: [{
                  name: 'AirQuality',
                  currentSensorState: AirQualityState.GOOD
                }]
              }
            }
          }
        });

        // Verify fetch was called with RTT API
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('api.rtt.io'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Basic ')
            })
          })
        );
      });

      it('should return FAIR air quality when train is 1-5 minutes late', async () => {
        // Create a slightly modified response with 3 minute delay
        const runningOnTime = loadTestData('examples/runningOnTime.json');
        
        // Deep clone and modify all services to be 3 minutes late
        const lateData = JSON.parse(JSON.stringify(runningOnTime));
        lateData.services.forEach(service => {
          if (service.locationDetail.gbttBookedDeparture && service.locationDetail.realtimeDeparture) {
            const bookedMins = parseInt(service.locationDetail.gbttBookedDeparture.substring(0, 2)) * 60 +
                               parseInt(service.locationDetail.gbttBookedDeparture.substring(2));
            const lateMins = bookedMins + 3;
            const lateHours = Math.floor(lateMins / 60);
            const lateMinutes = lateMins % 60;
            service.locationDetail.realtimeDeparture = 
              String(lateHours).padStart(2, '0') + String(lateMinutes).padStart(2, '0');
          }
        });

        fetch.mockImplementation(() => mockFetchResponse(lateData));

        const queryRequest = {
          requestId: 'test-request-123',
          inputs: [{
            intent: GoogleHomeApi.Intent.QUERY,
            payload: { devices: [{ id: 'train_1' }] }
          }]
        };

        const response = await request(app)
          .post('/smarthome')
          .send(queryRequest)
          .expect(200);

        expect(response.body.payload.devices.train_1.currentSensorStateData[0].currentSensorState)
          .toBe(AirQualityState.FAIR);
      });

      it('should return POOR air quality when train is 6-10 minutes late', async () => {
        // Create a response with 9 minute delay (within POOR threshold of <=10)
        const runningOnTime = loadTestData('examples/runningOnTime.json');
        const lateData = JSON.parse(JSON.stringify(runningOnTime));
        lateData.services.forEach(service => {
          if (service.locationDetail.gbttBookedDeparture && service.locationDetail.realtimeDeparture) {
            const bookedMins = parseInt(service.locationDetail.gbttBookedDeparture.substring(0, 2)) * 60 +
                               parseInt(service.locationDetail.gbttBookedDeparture.substring(2));
            const lateMins = bookedMins + 9;
            const lateHours = Math.floor(lateMins / 60);
            const lateMinutes = lateMins % 60;
            service.locationDetail.realtimeDeparture = 
              String(lateHours).padStart(2, '0') + String(lateMinutes).padStart(2, '0');
          }
        });

        fetch.mockImplementation(() => mockFetchResponse(lateData));

        const queryRequest = {
          requestId: 'test-request-123',
          inputs: [{
            intent: GoogleHomeApi.Intent.QUERY,
            payload: { devices: [{ id: 'train_1' }] }
          }]
        };

        const response = await request(app)
          .post('/smarthome')
          .send(queryRequest)
          .expect(200);

        expect(response.body.payload.devices.train_1.currentSensorStateData[0].currentSensorState)
          .toBe(AirQualityState.POOR);
      });

      it('should return VERY_POOR air quality when train is more than 10 minutes late', async () => {
        // Create a response with 25 minute delay
        const runningOnTime = loadTestData('examples/runningOnTime.json');
        
        const veryLateData = JSON.parse(JSON.stringify(runningOnTime));
        veryLateData.services.forEach(service => {
          if (service.locationDetail.gbttBookedDeparture && service.locationDetail.realtimeDeparture) {
            const bookedMins = parseInt(service.locationDetail.gbttBookedDeparture.substring(0, 2)) * 60 +
                               parseInt(service.locationDetail.gbttBookedDeparture.substring(2));
            const lateMins = bookedMins + 25;
            const lateHours = Math.floor(lateMins / 60);
            const lateMinutes = lateMins % 60;
            service.locationDetail.realtimeDeparture = 
              String(lateHours).padStart(2, '0') + String(lateMinutes).padStart(2, '0');
          }
        });

        fetch.mockImplementation(() => mockFetchResponse(veryLateData));

        const queryRequest = {
          requestId: 'test-request-123',
          inputs: [{
            intent: GoogleHomeApi.Intent.QUERY,
            payload: { devices: [{ id: 'train_1' }] }
          }]
        };

        const response = await request(app)
          .post('/smarthome')
          .send(queryRequest)
          .expect(200);

        expect(response.body.payload.devices.train_1.currentSensorStateData[0].currentSensorState)
          .toBe(AirQualityState.VERY_POOR);
      });

      it('should return VERY_POOR air quality when train is cancelled', async () => {
        // Create a cancelled train response
        const runningOnTime = loadTestData('examples/runningOnTime.json');
        const cancelledData = JSON.parse(JSON.stringify(runningOnTime));
        // Mark all services as cancelled
        cancelledData.services.forEach(service => {
          service.locationDetail.cancelReasonCode = '100';
          service.locationDetail.cancelReasonShortText = 'Cancelled';
        });

        fetch.mockImplementation(() => mockFetchResponse(cancelledData));

        const queryRequest = {
          requestId: 'test-request-123',
          inputs: [{
            intent: GoogleHomeApi.Intent.QUERY,
            payload: { devices: [{ id: 'train_1' }] }
          }]
        };

        const response = await request(app)
          .post('/smarthome')
          .send(queryRequest)
          .expect(200);

        expect(response.body.payload.devices.train_1.currentSensorStateData[0].currentSensorState)
          .toBe(AirQualityState.VERY_POOR);
      });

      it('should return UNKNOWN air quality when no suitable train is found', async () => {
        // Mock empty response (no trains found)
        fetch.mockImplementation(() => mockFetchResponse({ services: [] }));

        const queryRequest = {
          requestId: 'test-request-123',
          inputs: [{
            intent: GoogleHomeApi.Intent.QUERY,
            payload: { devices: [{ id: 'train_1' }] }
          }]
        };

        const response = await request(app)
          .post('/smarthome')
          .send(queryRequest)
          .expect(200);

        expect(response.body.payload.devices.train_1.currentSensorStateData[0].currentSensorState)
          .toBe(AirQualityState.UNKNOWN);
      });

      it('should use current system time for train status check', async () => {
        const runningOnTime = loadTestData('examples/runningOnTime.json');

        fetch.mockImplementation(() => mockFetchResponse(runningOnTime));

        const beforeRequest = Date.now();
        
        const queryRequest = {
          requestId: 'test-request-123',
          inputs: [{
            intent: GoogleHomeApi.Intent.QUERY,
            payload: { devices: [{ id: 'train_1' }] }
          }]
        };

        await request(app)
          .post('/smarthome')
          .send(queryRequest)
          .expect(200);

        const afterRequest = Date.now();

        // Verify fetch was called with a date close to current time
        const fetchUrl = fetch.mock.calls[0][0];
        expect(fetchUrl).toMatch(/\/\d{4}\/\d{2}\/\d{2}$/);
        
        // Extract date from URL and verify it's today
        const dateMatch = fetchUrl.match(/\/(\d{4})\/(\d{2})\/(\d{2})$/);
        if (dateMatch) {
          const urlDate = new Date(dateMatch[1], dateMatch[2] - 1, dateMatch[3]);
          const today = new Date();
          expect(urlDate.getFullYear()).toBe(today.getFullYear());
          expect(urlDate.getMonth()).toBe(today.getMonth());
          expect(urlDate.getDate()).toBe(today.getDate());
        }
      });

      it('should handle errors from RTT API gracefully', async () => {
        // Mock fetch to reject (network error)
        fetch.mockRejectedValue(new Error('Network error'));

        const queryRequest = {
          requestId: 'test-request-123',
          inputs: [{
            intent: GoogleHomeApi.Intent.QUERY,
            payload: { devices: [{ id: 'train_1' }] }
          }]
        };

        const response = await request(app)
          .post('/smarthome')
          .send(queryRequest)
          .expect(502);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Unsupported Intents', () => {
      it('should return 400 for EXECUTE intent', async () => {
        const executeRequest = {
          requestId: 'test-request-123',
          inputs: [{
            intent: GoogleHomeApi.Intent.EXECUTE,
            payload: {
              commands: [{
                devices: [{ id: 'train_1' }],
                execution: [{ command: 'action.devices.commands.OnOff', params: { on: true } }]
              }]
            }
          }]
        };

        const response = await request(app)
          .post('/smarthome')
          .send(executeRequest)
          .expect(400);

        expect(response.body).toEqual({ error: 'Unsupported intent' });
      });

      it('should return 400 for DISCONNECT intent', async () => {
        const disconnectRequest = {
          requestId: 'test-request-123',
          inputs: [{
            intent: GoogleHomeApi.Intent.DISCONNECT
          }]
        };

        const response = await request(app)
          .post('/smarthome')
          .send(disconnectRequest)
          .expect(400);

        expect(response.body).toEqual({ error: 'Unsupported intent' });
      });

      it('should return 400 for unknown intent', async () => {
        const unknownRequest = {
          requestId: 'test-request-123',
          inputs: [{
            intent: 'action.devices.UNKNOWN'
          }]
        };

        const response = await request(app)
          .post('/smarthome')
          .send(unknownRequest)
          .expect(400);

        expect(response.body).toEqual({ error: 'Unsupported intent' });
      });
    });

    describe('Request Validation', () => {
      it('should preserve requestId in response', async () => {
        const uniqueRequestId = 'unique-request-id-12345';
        const syncRequest = {
          requestId: uniqueRequestId,
          inputs: [{ intent: GoogleHomeApi.Intent.SYNC }]
        };

        const response = await request(app)
          .post('/smarthome')
          .send(syncRequest)
          .expect(200);

        expect(response.body.requestId).toBe(uniqueRequestId);
      });

      it('should handle requests with multiple devices in QUERY', async () => {
        const runningOnTime = loadTestData('examples/runningOnTime.json');

        fetch.mockImplementation(() => mockFetchResponse(runningOnTime));

        const queryRequest = {
          requestId: 'test-request-123',
          inputs: [{
            intent: GoogleHomeApi.Intent.QUERY,
            payload: {
              devices: [
                { id: 'train_1' },
                { id: 'other_device' }
              ]
            }
          }]
        };

        const response = await request(app)
          .post('/smarthome')
          .send(queryRequest)
          .expect(200);

        // Should only return data for train_1 (our device)
        expect(Object.keys(response.body.payload.devices)).toEqual(['train_1']);
      });
    });
  });
});
