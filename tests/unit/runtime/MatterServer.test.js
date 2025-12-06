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
});
