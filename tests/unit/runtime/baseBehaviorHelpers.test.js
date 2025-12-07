import { describe, it, expect } from '@jest/globals';

import {
  TemperatureConstants,
  celsiusToMeasuredValue,
  clampDelay,
} from '../../../src/runtime/behaviors/baseBehaviorHelpers.js';

describe('baseBehaviorHelpers', () => {
  describe('TemperatureConstants', () => {
    it('should have correct min/max Celsius values', () => {
      expect(TemperatureConstants.MIN_CELSIUS).toBe(-10);
      expect(TemperatureConstants.MAX_CELSIUS).toBe(50);
    });

    it('should have correct min/max measured values', () => {
      expect(TemperatureConstants.MIN_MEASURED_VALUE).toBe(-1000);
      expect(TemperatureConstants.MAX_MEASURED_VALUE).toBe(5000);
    });

    it('should have correct conversion factor', () => {
      expect(TemperatureConstants.CELSIUS_TO_MEASURED_VALUE).toBe(100);
    });

    it('should have correct no-service sentinel', () => {
      expect(TemperatureConstants.NO_SERVICE_SENTINEL).toBe(5000);
    });
  });

  describe('celsiusToMeasuredValue()', () => {
    it('should convert 0°C to 0', () => {
      expect(celsiusToMeasuredValue(0)).toBe(0);
    });

    it('should convert positive temperatures', () => {
      expect(celsiusToMeasuredValue(25)).toBe(2500);
      expect(celsiusToMeasuredValue(50)).toBe(5000);
    });

    it('should convert negative temperatures', () => {
      expect(celsiusToMeasuredValue(-10)).toBe(-1000);
      expect(celsiusToMeasuredValue(-5)).toBe(-500);
    });

    it('should handle decimal temperatures', () => {
      expect(celsiusToMeasuredValue(25.5)).toBe(2550);
      expect(celsiusToMeasuredValue(25.55)).toBe(2555);
    });

    it('should round decimal temperatures', () => {
      expect(celsiusToMeasuredValue(25.555)).toBe(2556);
      expect(celsiusToMeasuredValue(25.554)).toBe(2555);
    });
  });

  describe('clampDelay()', () => {
    it('should not clamp values within range', () => {
      expect(clampDelay(0)).toBe(0);
      expect(clampDelay(25)).toBe(25);
      expect(clampDelay(-5)).toBe(-5);
    });

    it('should clamp values below minimum', () => {
      expect(clampDelay(-15)).toBe(-10);
      expect(clampDelay(-100)).toBe(-10);
    });

    it('should clamp values above maximum', () => {
      expect(clampDelay(60)).toBe(50);
      expect(clampDelay(100)).toBe(50);
    });

    it('should handle boundary values', () => {
      expect(clampDelay(-10)).toBe(-10);
      expect(clampDelay(50)).toBe(50);
    });
  });
});
