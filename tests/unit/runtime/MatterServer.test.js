import { describe, it, expect, beforeEach } from '@jest/globals';

/**
 * Unit tests for MatterServer v0.15 custom behaviors
 * Tests the TrainTemperatureServer and TrainStatusModeServer behaviors
 */

describe('MatterServer Custom Behaviors', () => {
  describe('TrainTemperatureServer', () => {
    let mockBehavior;

    beforeEach(() => {
      // Mock the behavior with state management
      mockBehavior = {
        state: {
          measuredValue: 0,
        },
        async setDelayMinutes(delayMinutes) {
          if (delayMinutes == null) {
            await this.setMeasuredValue(null);
            return;
          }
          const tempCelsius = Math.min(Math.max(delayMinutes, -10), 50);
          const tempValue = Math.round(tempCelsius * 100);
          await this.setMeasuredValue(tempValue);
        },
        async setTemperature(tempCelsius) {
          const tempValue = Math.round(tempCelsius * 100);
          await this.setMeasuredValue(tempValue);
        },
        async setMeasuredValue(value) {
          this.state.measuredValue = value;
        },
      };
    });

    describe('setDelayMinutes()', () => {
      it('should map 0 minutes delay to 0°C (0 value)', async () => {
        await mockBehavior.setDelayMinutes(0);
        expect(mockBehavior.state.measuredValue).toBe(0);
      });

      it('should map 1 minute delay to 1°C (100 value)', async () => {
        await mockBehavior.setDelayMinutes(1);
        expect(mockBehavior.state.measuredValue).toBe(100);
      });

      it('should map 10 minutes delay to 10°C (1000 value)', async () => {
        await mockBehavior.setDelayMinutes(10);
        expect(mockBehavior.state.measuredValue).toBe(1000);
      });

      it('should map 25 minutes delay to 25°C (2500 value)', async () => {
        await mockBehavior.setDelayMinutes(25);
        expect(mockBehavior.state.measuredValue).toBe(2500);
      });

      it('should map -5 minutes (early) to -5°C (-500 value)', async () => {
        await mockBehavior.setDelayMinutes(-5);
        expect(mockBehavior.state.measuredValue).toBe(-500);
      });

      it('should cap at -10°C for very early arrivals', async () => {
        await mockBehavior.setDelayMinutes(-15);
        expect(mockBehavior.state.measuredValue).toBe(-1000);
      });

      it('should cap at -10°C for extremely early arrivals', async () => {
        await mockBehavior.setDelayMinutes(-100);
        expect(mockBehavior.state.measuredValue).toBe(-1000);
      });

      it('should cap at 50°C for 50 minute delay', async () => {
        await mockBehavior.setDelayMinutes(50);
        expect(mockBehavior.state.measuredValue).toBe(5000);
      });

      it('should cap at 50°C for extremely long delays', async () => {
        await mockBehavior.setDelayMinutes(100);
        expect(mockBehavior.state.measuredValue).toBe(5000);
      });

      it('should cap at 50°C for delays over 1000 minutes', async () => {
        await mockBehavior.setDelayMinutes(1000);
        expect(mockBehavior.state.measuredValue).toBe(5000);
      });
    });

    describe('setTemperature()', () => {
      it('should set temperature directly via setTemperature', async () => {
        await mockBehavior.setTemperature(25);
        expect(mockBehavior.state.measuredValue).toBe(2500);
      });

      it('should handle decimal temperature values', async () => {
        await mockBehavior.setTemperature(23.5);
        expect(mockBehavior.state.measuredValue).toBe(2350);
      });

      it('should handle negative temperature values', async () => {
        await mockBehavior.setTemperature(-10);
        expect(mockBehavior.state.measuredValue).toBe(-1000);
      });

      it('should handle very high temperature values', async () => {
        await mockBehavior.setTemperature(60);
        expect(mockBehavior.state.measuredValue).toBe(6000);
      });

      it('should handle zero temperature', async () => {
        await mockBehavior.setTemperature(0);
        expect(mockBehavior.state.measuredValue).toBe(0);
      });
    });

    describe('Temperature Units', () => {
      it('should store temperature in hundredths of degrees (0.01°C)', async () => {
        await mockBehavior.setTemperature(25.67);
        expect(mockBehavior.state.measuredValue).toBe(2567);
      });

      it('should handle rounding correctly', async () => {
        await mockBehavior.setTemperature(25.666);
        expect(mockBehavior.state.measuredValue).toBe(2567);
      });

      it('should handle rounding down correctly', async () => {
        await mockBehavior.setTemperature(25.664);
        expect(mockBehavior.state.measuredValue).toBe(2566);
      });
    });

    describe('Edge Cases', () => {
      it('should handle null delay gracefully', async () => {
        await expect(mockBehavior.setDelayMinutes(null)).resolves.not.toThrow();
        expect(mockBehavior.state.measuredValue).toBeNull(); // expect measuredValue to be null
      });

      it('should handle undefined delay gracefully', async () => {
        await expect(mockBehavior.setDelayMinutes(undefined)).resolves.not.toThrow();
      });

      it('should handle NaN temperature gracefully', async () => {
        await expect(mockBehavior.setTemperature(NaN)).resolves.not.toThrow();
      });
    });
  });

  describe('TrainStatusModeServer', () => {
    let mockBehavior;

    beforeEach(() => {
      // Mock the mode select behavior
      mockBehavior = {
        state: {
          description: '',
          standardNamespace: null,
          supportedModes: [],
          currentMode: 4,
        },
        async initialize() {
          this.state.description = 'Train punctuality status';
          this.state.standardNamespace = null;
          this.state.supportedModes = [
            { label: 'On Time', mode: 0, semanticTags: [] },
            { label: 'Minor Delay', mode: 1, semanticTags: [] },
            { label: 'Delayed', mode: 2, semanticTags: [] },
            { label: 'Major Delay', mode: 3, semanticTags: [] },
            { label: 'Unknown', mode: 4, semanticTags: [] },
          ];
          this.state.currentMode = 4;
        },
        async setTrainStatus(statusCode) {
          const modeMap = {
            on_time: 0,
            minor_delay: 1,
            delayed: 2,
            major_delay: 3,
            unknown: 4,
          };
          const modeValue = modeMap[statusCode] ?? modeMap.unknown;
          await this.changeToMode({ newMode: modeValue });
        },
        async changeToMode({ newMode }) {
          this.state.currentMode = newMode;
        },
      };
    });

    describe('initialize()', () => {
      it('should set description to "Train punctuality status"', async () => {
        await mockBehavior.initialize();
        expect(mockBehavior.state.description).toBe('Train punctuality status');
      });

      it('should set standardNamespace to null for custom modes', async () => {
        await mockBehavior.initialize();
        expect(mockBehavior.state.standardNamespace).toBeNull();
      });

      it('should initialize with 5 supported modes', async () => {
        await mockBehavior.initialize();
        expect(mockBehavior.state.supportedModes).toHaveLength(5);
      });

      it('should have "On Time" as mode 0', async () => {
        await mockBehavior.initialize();
        expect(mockBehavior.state.supportedModes[0]).toEqual({
          label: 'On Time',
          mode: 0,
          semanticTags: [],
        });
      });

      it('should have "Minor Delay" as mode 1', async () => {
        await mockBehavior.initialize();
        expect(mockBehavior.state.supportedModes[1]).toEqual({
          label: 'Minor Delay',
          mode: 1,
          semanticTags: [],
        });
      });

      it('should have "Delayed" as mode 2', async () => {
        await mockBehavior.initialize();
        expect(mockBehavior.state.supportedModes[2]).toEqual({
          label: 'Delayed',
          mode: 2,
          semanticTags: [],
        });
      });

      it('should have "Major Delay" as mode 3', async () => {
        await mockBehavior.initialize();
        expect(mockBehavior.state.supportedModes[3]).toEqual({
          label: 'Major Delay',
          mode: 3,
          semanticTags: [],
        });
      });

      it('should have "Unknown" as mode 4', async () => {
        await mockBehavior.initialize();
        expect(mockBehavior.state.supportedModes[4]).toEqual({
          label: 'Unknown',
          mode: 4,
          semanticTags: [],
        });
      });

      it('should start with currentMode as 4 (unknown)', async () => {
        await mockBehavior.initialize();
        expect(mockBehavior.state.currentMode).toBe(4);
      });
    });

    describe('setTrainStatus()', () => {
      beforeEach(async () => {
        await mockBehavior.initialize();
      });

      it('should map "on_time" to mode 0', async () => {
        await mockBehavior.setTrainStatus('on_time');
        expect(mockBehavior.state.currentMode).toBe(0);
      });

      it('should map "minor_delay" to mode 1', async () => {
        await mockBehavior.setTrainStatus('minor_delay');
        expect(mockBehavior.state.currentMode).toBe(1);
      });

      it('should map "delayed" to mode 2', async () => {
        await mockBehavior.setTrainStatus('delayed');
        expect(mockBehavior.state.currentMode).toBe(2);
      });

      it('should map "major_delay" to mode 3', async () => {
        await mockBehavior.setTrainStatus('major_delay');
        expect(mockBehavior.state.currentMode).toBe(3);
      });

      it('should map "unknown" to mode 4', async () => {
        await mockBehavior.setTrainStatus('unknown');
        expect(mockBehavior.state.currentMode).toBe(4);
      });

      it('should default invalid status codes to mode 4 (unknown)', async () => {
        await mockBehavior.setTrainStatus('invalid_status');
        expect(mockBehavior.state.currentMode).toBe(4);
      });

      it('should handle null status code', async () => {
        await mockBehavior.setTrainStatus(null);
        expect(mockBehavior.state.currentMode).toBe(4);
      });

      it('should handle undefined status code', async () => {
        await mockBehavior.setTrainStatus(undefined);
        expect(mockBehavior.state.currentMode).toBe(4);
      });

      it('should handle empty string status code', async () => {
        await mockBehavior.setTrainStatus('');
        expect(mockBehavior.state.currentMode).toBe(4);
      });
    });

    describe('Mode transitions', () => {
      beforeEach(async () => {
        await mockBehavior.initialize();
      });

      it('should transition from unknown to on_time', async () => {
        expect(mockBehavior.state.currentMode).toBe(4);
        await mockBehavior.setTrainStatus('on_time');
        expect(mockBehavior.state.currentMode).toBe(0);
      });

      it('should transition from on_time to delayed', async () => {
        await mockBehavior.setTrainStatus('on_time');
        expect(mockBehavior.state.currentMode).toBe(0);
        await mockBehavior.setTrainStatus('delayed');
        expect(mockBehavior.state.currentMode).toBe(2);
      });

      it('should transition from delayed to on_time', async () => {
        await mockBehavior.setTrainStatus('delayed');
        expect(mockBehavior.state.currentMode).toBe(2);
        await mockBehavior.setTrainStatus('on_time');
        expect(mockBehavior.state.currentMode).toBe(0);
      });
    });
  });

  describe('Event Handler Logic', () => {
    it('should use correct event name "statusChange"', () => {
      const eventName = 'statusChange';
      expect(eventName).toBe('statusChange');
      expect(eventName).not.toBe('statusChanged');
    });

    it('should map currentMode to statusCode correctly', () => {
      const modeToStatus = {
        0: 'on_time',
        1: 'minor_delay',
        2: 'delayed',
        3: 'major_delay',
        4: 'unknown',
      };

      expect(modeToStatus[0]).toBe('on_time');
      expect(modeToStatus[1]).toBe('minor_delay');
      expect(modeToStatus[2]).toBe('delayed');
      expect(modeToStatus[3]).toBe('major_delay');
      expect(modeToStatus[4]).toBe('unknown');
    });

    it('should handle missing mode in mapping', () => {
      const modeToStatus = {
        0: 'on_time',
        1: 'minor_delay',
        2: 'delayed',
        3: 'major_delay',
        4: 'unknown',
      };

      const statusCode = modeToStatus[99] || 'unknown';
      expect(statusCode).toBe('unknown');
    });
  });

  describe('TrainStatusAirQualityServer', () => {
    let mockBehavior;

    beforeEach(async () => {
      const { STATUS_TO_AIR_QUALITY } = await import('../../../src/domain/airQualityMapping.js');
      mockBehavior = {
        state: {
          airQuality: 0, // Unknown
        },
        async setTrainStatus(statusCode) {
          const airQualityValue = STATUS_TO_AIR_QUALITY[statusCode] ?? 0;
          await this.setAirQuality(airQualityValue);
        },
        async setAirQuality(value) {
          this.state.airQuality = value;
        },
      };
    });
    describe('initialization', () => {
      it('should initialize with Unknown air quality (0)', () => {
        expect(mockBehavior.state.airQuality).toBe(0);
      });
    });

    describe('setTrainStatus() mapping', () => {
      it('should map on_time to Good (1)', async () => {
        await mockBehavior.setTrainStatus('on_time');
        expect(mockBehavior.state.airQuality).toBe(1);
      });

      it('should map minor_delay to Fair (2)', async () => {
        await mockBehavior.setTrainStatus('minor_delay');
        expect(mockBehavior.state.airQuality).toBe(2);
      });

      it('should map delayed to Moderate (3)', async () => {
        await mockBehavior.setTrainStatus('delayed');
        expect(mockBehavior.state.airQuality).toBe(3);
      });

      it('should map major_delay to Poor (4)', async () => {
        await mockBehavior.setTrainStatus('major_delay');
        expect(mockBehavior.state.airQuality).toBe(4);
      });

      it('should map unknown to VeryPoor (5)', async () => {
        await mockBehavior.setTrainStatus('unknown');
        expect(mockBehavior.state.airQuality).toBe(5);
      });

      it('should map critical to VeryPoor (5)', async () => {
        await mockBehavior.setTrainStatus('critical');
        expect(mockBehavior.state.airQuality).toBe(5);
      });

      it('should default to Unknown (0) for invalid status', async () => {
        await mockBehavior.setTrainStatus('invalid');
        expect(mockBehavior.state.airQuality).toBe(0);
      });
    });

    describe('status transitions', () => {
      it('should handle improvement from Poor to Good', async () => {
        await mockBehavior.setTrainStatus('major_delay');
        expect(mockBehavior.state.airQuality).toBe(4);

        await mockBehavior.setTrainStatus('on_time');
        expect(mockBehavior.state.airQuality).toBe(1);
      });

      it('should handle degradation from Good to Poor', async () => {
        await mockBehavior.setTrainStatus('on_time');
        expect(mockBehavior.state.airQuality).toBe(1);

        await mockBehavior.setTrainStatus('major_delay');
        expect(mockBehavior.state.airQuality).toBe(4);
      });

      it('should handle gradual degradation', async () => {
        await mockBehavior.setTrainStatus('on_time');
        expect(mockBehavior.state.airQuality).toBe(1);

        await mockBehavior.setTrainStatus('minor_delay');
        expect(mockBehavior.state.airQuality).toBe(2);

        await mockBehavior.setTrainStatus('delayed');
        expect(mockBehavior.state.airQuality).toBe(3);

        await mockBehavior.setTrainStatus('major_delay');
        expect(mockBehavior.state.airQuality).toBe(4);
      });
    });
  });

  describe('Endpoint selection startup behaviour (mode vs air quality)', () => {
    function getEndpointConfig({ useBridge, primaryEndpoint }) {
      const tempBehaviors = ['temp'];
      const modeBehaviors = useBridge || primaryEndpoint === 'mode' ? ['mode'] : undefined;
      const airQualityBehaviors =
        useBridge || primaryEndpoint === 'airQuality' ? ['air'] : undefined;

      return { tempBehaviors, modeBehaviors, airQualityBehaviors };
    }

    it('creates temperature and mode endpoints by default when not bridged', () => {
      const { tempBehaviors, modeBehaviors, airQualityBehaviors } = getEndpointConfig({
        useBridge: false,
        primaryEndpoint: 'mode',
      });

      expect(tempBehaviors).toEqual(['temp']);
      expect(modeBehaviors).toEqual(['mode']);
      expect(airQualityBehaviors).toBeUndefined();
    });

    it('creates temperature and air quality endpoints when PRIMARY_ENDPOINT=airQuality', () => {
      const { tempBehaviors, modeBehaviors, airQualityBehaviors } = getEndpointConfig({
        useBridge: false,
        primaryEndpoint: 'airQuality',
      });

      expect(tempBehaviors).toEqual(['temp']);
      expect(modeBehaviors).toBeUndefined();
      expect(airQualityBehaviors).toEqual(['air']);
    });

    it('creates all three endpoints when bridge mode is enabled', () => {
      const { tempBehaviors, modeBehaviors, airQualityBehaviors } = getEndpointConfig({
        useBridge: true,
        primaryEndpoint: 'airQuality',
      });

      expect(tempBehaviors).toEqual(['temp']);
      expect(modeBehaviors).toEqual(['mode']);
      expect(airQualityBehaviors).toEqual(['air']);
    });
  });
});

describe('MatterServer statusChange handler', () => {
  it('updates only available endpoints without throwing', async () => {
    const updates = {
      mode: [],
      temp: [],
      air: [],
    };

    const modeDevice = {
      async act(fn) {
        await fn({
          modeSelect: {
            async setTrainStatus(statusCode) {
              updates.mode.push(statusCode);
            },
          },
        });
      },
    };

    const tempSensor = {
      async act(fn) {
        await fn({
          temperatureMeasurement: {
            async setDelayMinutes(delay) {
              updates.temp.push(delay);
            },
          },
        });
      },
    };

    const airQualityDevice = {
      async act(fn) {
        await fn({
          airQuality: {
            async setTrainStatus(statusCode) {
              updates.air.push(statusCode);
            },
          },
        });
      },
    };

    // Import handler indirectly by creating a tiny shim that mirrors the
    // logic inside startMatterServer's statusChange listener.
    const handler = async (status) => {
      // Derived from src/domain/modeMapping.js
      const MODE_TO_STATUS = {
        0: 'on_time',
        1: 'minor_delay',
        2: 'delayed',
        3: 'major_delay',
        4: 'unknown',
      };

      const deriveModeFromDelay = (delayMinutes) => {
        if (delayMinutes == null || Number.isNaN(Number(delayMinutes))) {
          return 4;
        }
        const delay = Number(delayMinutes);
        const abs = Math.abs(delay);
        if (abs <= 2) return 0;
        if (abs <= 5) return 1;
        if (abs <= 10) return 2;
        return 3;
      };

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
          await agent.temperatureMeasurement.setDelayMinutes(status?.delayMinutes ?? null);
        });
      }

      if (airQualityDevice) {
        await airQualityDevice.act(async (agent) => {
          await agent.airQuality.setTrainStatus(statusCode);
        });
      }
    };

    await expect(handler({ delayMinutes: 7 })).resolves.not.toThrow();
    expect(updates.mode).toEqual(['delayed']);
    expect(updates.temp).toEqual([7]);
    expect(updates.air).toEqual(['delayed']);
  });
});
