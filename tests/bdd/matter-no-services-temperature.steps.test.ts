// @ts-nocheck
import { defineFeature, loadFeature } from 'jest-cucumber';

const feature = loadFeature('./tests/bdd/features/matter-no-services-temperature.feature');

defineFeature(feature, (test) => {
  let mockTemperatureEndpoint;
  let mockModeEndpoint;

  // Create mock Matter endpoints that capture state changes
  const createMockEndpoints = () => {
    const tempState = { measuredValue: null };
    const modeState = { currentMode: 4 }; // unknown

    return {
      temp: {
        state: tempState,
        async act(fn) {
          await fn({
            temperatureMeasurement: {
              async setDelayMinutes(delayMinutes) {
                if (delayMinutes == null) {
                  tempState.measuredValue = null;
                  return;
                }
                const tempCelsius = Math.min(Math.max(delayMinutes, -10), 50);
                tempState.measuredValue = Math.round(tempCelsius * 100);
              },
              async setNoServiceTemperature() {
                tempState.measuredValue = 50 * 100;
              },
            },
          });
        },
      },
      mode: {
        state: modeState,
        async act(fn) {
          await fn({
            modeSelect: {
              async setTrainStatus(statusCode) {
                const modeMap = {
                  on_time: 0,
                  minor_delay: 1,
                  delayed: 2,
                  major_delay: 3,
                  unknown: 4,
                };
                modeState.currentMode = modeMap[statusCode] ?? 4;
              },
            },
          });
        },
      },
    };
  };

  // Real statusChange handler logic from MatterServer (extracted for reuse)
  const handleStatusChange = async (status, tempSensor, modeDevice) => {
    const { deriveModeFromDelay, MODE_TO_STATUS } = await import('../../src/domain/modeMapping.js');

    let computedMode = deriveModeFromDelay(status?.delayMinutes);
    if (Number.isNaN(Number(status?.delayMinutes)) && typeof status?.currentMode === 'number') {
      computedMode = status.currentMode;
    }

    const statusCode = MODE_TO_STATUS[computedMode] || 'unknown';

    if (modeDevice) {
      await modeDevice.act(async (agent) => {
        await agent.modeSelect.setTrainStatus(statusCode);
      });
    }

    if (tempSensor) {
      await tempSensor.act(async (agent) => {
        if (statusCode === 'unknown' && status?.selectedService === null) {
          await agent.temperatureMeasurement.setNoServiceTemperature();
        } else {
          await agent.temperatureMeasurement.setDelayMinutes(status?.delayMinutes ?? null);
        }
      });
    }
  };

  beforeEach(async () => {
    // Create mock endpoints
    const endpoints = createMockEndpoints();
    mockTemperatureEndpoint = endpoints.temp;
    mockModeEndpoint = endpoints.mode;
  });

  test('On-time train uses 0 temperature', ({ given, and, when, then }) => {
    given('a Matter-enabled RTT Checker is running', () => {
      // Mock endpoints created in beforeEach
    });

    and('I have configured my route from Cambridge to Kings Cross', () => {
      // Configuration is in config.js (CAMBDGE -> KNGX)
    });

    given('the train status is on_time', async () => {
      // Simulate statusChange event for on-time train
      const status = {
        timestamp: new Date(),
        previousMode: 4, // UNKNOWN
        currentMode: 0, // ON_TIME
        modeChanged: true,
        trainStatus: 'ON_TIME',
        selectedService: { locationDetail: { realtimeGbttDepartureLateness: 0 } },
        delayMinutes: 0,
        raw: null,
        error: null,
      };

      // Apply real statusChange handler logic
      await handleStatusChange(status, mockTemperatureEndpoint, mockModeEndpoint);
    });

    when('I query the Matter temperature sensor device', () => {
      // State is already captured in mockTemperatureEndpoint
    });

    then('the temperature sensor should expose a value of 0', () => {
      expect(mockTemperatureEndpoint.state.measuredValue).toBe(0);
      expect(mockModeEndpoint.state.currentMode).toBe(0); // ON_TIME mode
    });
  });

  test('No suitable train found uses sentinel temperature', ({ given, and, when, then }) => {
    given('a Matter-enabled RTT Checker is running', () => {
      // Mock endpoints created in beforeEach
    });

    and('I have configured my route from Cambridge to Kings Cross', () => {
      // Configuration is in config.js (CAMBDGE -> KNGX)
    });

    given('no trains match my criteria', () => {
      // Will be surfaced as unknown with null selectedService
    });

    and('the train status is unknown', async () => {
      // Simulate statusChange event for no services found
      const status = {
        timestamp: new Date(),
        previousMode: 4, // UNKNOWN
        currentMode: 4, // UNKNOWN
        modeChanged: false,
        trainStatus: 'UNKNOWN',
        selectedService: null, // Key: no service found
        delayMinutes: null,
        raw: null,
        error: null,
      };

      // Apply real statusChange handler logic
      await handleStatusChange(status, mockTemperatureEndpoint, mockModeEndpoint);
    });

    when('I query the Matter temperature sensor device', () => {
      // State is already captured in mockTemperatureEndpoint
    });

    then('the mode device should show "unknown"', () => {
      expect(mockModeEndpoint.state.currentMode).toBe(4); // UNKNOWN mode
    });

    and('the temperature sensor should expose the sentinel value 50', () => {
      expect(mockTemperatureEndpoint.state.measuredValue).toBe(5000); // 50°C in hundredths
    });
  });

  test('First update with no services shows sentinel temperature', ({ given, and, when, then }) => {
    // Test the real device initialization flow
    let device;
    let capturedEvent = null;

    given('a Matter-enabled RTT Checker is running', () => {
      // Mock endpoints created in beforeEach
    });

    and('I have configured my route from Cambridge to Kings Cross', () => {
      // Configuration is in config.js (CAMBDGE -> KNGX)
    });

    given('the device has just started', async () => {
      // Dynamically import to use real TrainStatusDevice
      const { TrainStatusDevice } = await import('../../src/devices/TrainStatusDevice.js');
      device = new TrainStatusDevice();

      // Verify initial state
      expect(device.currentMode).toBe(4); // UNKNOWN
      expect(device.isFirstUpdate).toBe(true);

      // Capture the statusChange event
      device.on('statusChange', (status) => {
        capturedEvent = status;
      });
    });

    and('no trains match my criteria', async () => {
      // Mock getTrainStatus to return no services
      const trainStatusModule = await import('../../src/services/trainStatusService.js');
      jest.spyOn(trainStatusModule, 'getTrainStatus').mockResolvedValueOnce({
        status: 'UNKNOWN',
        selected: null,
        raw: { services: [] },
      });
    });

    when('the device performs its first status update', async () => {
      await device.updateTrainStatus();
    });

    then('a statusChange event should be emitted', () => {
      expect(capturedEvent).toBeDefined();
      expect(capturedEvent).not.toBeNull();
    });

    and('the event should indicate no service found', () => {
      expect(capturedEvent.trainStatus).toBe('UNKNOWN');
      expect(capturedEvent.selectedService).toBeNull();
      expect(capturedEvent.delayMinutes).toBeNull();
      expect(capturedEvent.modeChanged).toBe(false); // Mode starts as UNKNOWN and stays UNKNOWN
      expect(capturedEvent.currentMode).toBe(4);
      expect(capturedEvent.previousMode).toBe(4);
    });

    and('the temperature sensor should expose the sentinel value 50', async () => {
      // Apply the real statusChange handler to mock endpoint
      await handleStatusChange(capturedEvent, mockTemperatureEndpoint, mockModeEndpoint);
      expect(mockTemperatureEndpoint.state.measuredValue).toBe(5000); // 50°C in hundredths
    });
  });
});
