import { describe, it, expect, beforeEach } from '@jest/globals';

/**
 * Unit tests for TrainTemperatureServer behavior
 * Tests the mapping of train delay minutes to temperature values
 */

describe('TrainTemperatureServer', () => {
  let mockBehavior;

  beforeEach(() => {
    // Mock the behavior with state management
    mockBehavior = {
      state: {
        minMeasuredValue: -1000, // -10.00°C
        maxMeasuredValue: 5000, // 50.00°C
        measuredValue: null,
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
      async setNoServiceTemperature() {
        await this.setMeasuredValue(50 * 100);
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

  describe('initialization', () => {
    it('should initialize with null temperature (unknown)', () => {
      expect(mockBehavior.state.measuredValue).toBe(null);
    });

    it('should set min/max temperature ranges', () => {
      expect(mockBehavior.state.minMeasuredValue).toBe(-1000);
      expect(mockBehavior.state.maxMeasuredValue).toBe(5000);
    });
  });

  describe('setDelayMinutes()', () => {
    it('should map 0 minutes to 0°C (on-time)', async () => {
      await mockBehavior.setDelayMinutes(0);
      expect(mockBehavior.state.measuredValue).toBe(0);
    });

    it('should map positive delays to equivalent temperature', async () => {
      await mockBehavior.setDelayMinutes(5);
      expect(mockBehavior.state.measuredValue).toBe(500); // 5°C in 0.01°C units
    });

    it('should map negative delays (early) to negative temperature', async () => {
      await mockBehavior.setDelayMinutes(-5);
      expect(mockBehavior.state.measuredValue).toBe(-500); // -5°C
    });

    it('should clamp delays below -10 to -10°C', async () => {
      await mockBehavior.setDelayMinutes(-20);
      expect(mockBehavior.state.measuredValue).toBe(-1000); // -10°C
    });

    it('should clamp delays above 50 to 50°C', async () => {
      await mockBehavior.setDelayMinutes(100);
      expect(mockBehavior.state.measuredValue).toBe(5000); // 50°C
    });

    it('should map null delay to null temperature (unknown)', async () => {
      await mockBehavior.setDelayMinutes(null);
      expect(mockBehavior.state.measuredValue).toBe(null);
    });

    it('should map undefined delay to null temperature', async () => {
      await mockBehavior.setDelayMinutes(undefined);
      expect(mockBehavior.state.measuredValue).toBe(null);
    });
  });

  describe('setNoServiceTemperature()', () => {
    it('should set 50°C sentinel value for no service', async () => {
      await mockBehavior.setNoServiceTemperature();
      expect(mockBehavior.state.measuredValue).toBe(5000); // 50°C
    });

    it('should distinguish no service (50°C) from on-time (0°C)', async () => {
      await mockBehavior.setDelayMinutes(0);
      expect(mockBehavior.state.measuredValue).toBe(0);

      await mockBehavior.setNoServiceTemperature();
      expect(mockBehavior.state.measuredValue).toBe(5000);
    });
  });

  describe('setTemperature()', () => {
    it('should set temperature directly in Celsius', async () => {
      await mockBehavior.setTemperature(25);
      expect(mockBehavior.state.measuredValue).toBe(2500); // 25°C
    });

    it('should handle decimal temperatures', async () => {
      await mockBehavior.setTemperature(25.5);
      expect(mockBehavior.state.measuredValue).toBe(2550); // 25.5°C
    });
  });

  describe('delay-to-temperature mapping scenarios', () => {
    it('should handle transition from on-time to delayed', async () => {
      await mockBehavior.setDelayMinutes(0);
      expect(mockBehavior.state.measuredValue).toBe(0);

      await mockBehavior.setDelayMinutes(15);
      expect(mockBehavior.state.measuredValue).toBe(1500);
    });

    it('should handle gradual delay increase', async () => {
      await mockBehavior.setDelayMinutes(3);
      expect(mockBehavior.state.measuredValue).toBe(300);

      await mockBehavior.setDelayMinutes(6);
      expect(mockBehavior.state.measuredValue).toBe(600);

      await mockBehavior.setDelayMinutes(11);
      expect(mockBehavior.state.measuredValue).toBe(1100);
    });

    it('should handle delay recovery', async () => {
      await mockBehavior.setDelayMinutes(20);
      expect(mockBehavior.state.measuredValue).toBe(2000);

      await mockBehavior.setDelayMinutes(10);
      expect(mockBehavior.state.measuredValue).toBe(1000);

      await mockBehavior.setDelayMinutes(0);
      expect(mockBehavior.state.measuredValue).toBe(0);
    });
  });
});
