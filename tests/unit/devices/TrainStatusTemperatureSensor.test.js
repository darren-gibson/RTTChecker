import { describe, it, expect, beforeEach } from '@jest/globals';
import { TemperatureMeasurementCluster } from '@matter/main/clusters/temperature-measurement';
import { IdentifyCluster } from '@matter/main/clusters/identify';

import { TrainStatusTemperatureSensor } from '../../../src/devices/TrainStatusTemperatureSensor.js';

describe('TrainStatusTemperatureSensor', () => {
  let sensor;

  beforeEach(() => {
    sensor = new TrainStatusTemperatureSensor();
  });

  // Helper function to get temperature in Celsius
  const getTemperature = (sensor) => {
    const cluster = sensor.getClusterServer(TemperatureMeasurementCluster);
    return cluster.getMeasuredValueAttribute() / 100;
  };

  describe('Temperature Mapping (1:1 minutes to Celsius)', () => {
    describe('On time', () => {
      it('should map 0 minutes delay to 0°C', () => {
        sensor.setDelayMinutes(0);
        const temp = getTemperature(sensor);
        expect(temp).toBe(0);
      });
    });

    describe('Early arrival (negative values)', () => {
      it('should map -1 minute (early) to -1°C', () => {
        sensor.setDelayMinutes(-1);
        const temp = getTemperature(sensor);
        expect(temp).toBe(-1);
      });

      it('should map -5 minutes (early) to -5°C', () => {
        sensor.setDelayMinutes(-5);
        const temp = getTemperature(sensor);
        expect(temp).toBe(-5);
      });

      it('should cap at -10°C for very early arrivals', () => {
        sensor.setDelayMinutes(-15);
        const temp = getTemperature(sensor);
        expect(temp).toBe(-10);
      });
    });

    describe('Minor delay (1-5 minutes)', () => {
      it('should map 1 minute delay to 1°C', () => {
        sensor.setDelayMinutes(1);
        const temp = getTemperature(sensor);
        expect(temp).toBe(1);
      });

      it('should map 3 minutes delay to 3°C', () => {
        sensor.setDelayMinutes(3);
        const temp = getTemperature(sensor);
        expect(temp).toBe(3);
      });

      it('should map 5 minutes delay to 5°C', () => {
        sensor.setDelayMinutes(5);
        const temp = getTemperature(sensor);
        expect(temp).toBe(5);
      });
    });

    describe('Moderate delay (6-15 minutes)', () => {
      it('should map 6 minutes delay to 6°C', () => {
        sensor.setDelayMinutes(6);
        const temp = getTemperature(sensor);
        expect(temp).toBe(6);
      });

      it('should map 10 minutes delay to 10°C', () => {
        sensor.setDelayMinutes(10);
        const temp = getTemperature(sensor);
        expect(temp).toBe(10);
      });

      it('should map 15 minutes delay to 15°C', () => {
        sensor.setDelayMinutes(15);
        const temp = getTemperature(sensor);
        expect(temp).toBe(15);
      });
    });

    describe('Major delay (16+ minutes)', () => {
      it('should map 20 minutes delay to 20°C', () => {
        sensor.setDelayMinutes(20);
        const temp = getTemperature(sensor);
        expect(temp).toBe(20);
      });

      it('should map 30 minutes delay to 30°C', () => {
        sensor.setDelayMinutes(30);
        const temp = getTemperature(sensor);
        expect(temp).toBe(30);
      });

      it('should map 45 minutes delay to 45°C', () => {
        sensor.setDelayMinutes(45);
        const temp = getTemperature(sensor);
        expect(temp).toBe(45);
      });

      it('should cap at 50°C for 50 minute delay', () => {
        sensor.setDelayMinutes(50);
        const temp = getTemperature(sensor);
        expect(temp).toBe(50);
      });

      it('should cap at 50°C for extremely long delays', () => {
        sensor.setDelayMinutes(100);
        const temp = getTemperature(sensor);
        expect(temp).toBe(50);
      });
    });
  });

  describe('Direct Temperature Setting', () => {
    it('should set temperature directly via setTemperature', () => {
      sensor.setTemperature(25);
      const temp = getTemperature(sensor);
      expect(temp).toBe(25);
    });

    it('should handle decimal temperature values', () => {
      sensor.setTemperature(23.5);
      const temp = getTemperature(sensor);
      expect(temp).toBe(23.5);
    });

    it('should handle negative temperature values', () => {
      sensor.setTemperature(-10);
      const temp = getTemperature(sensor);
      expect(temp).toBe(-10);
    });

    it('should handle very high temperature values', () => {
      sensor.setTemperature(60);
      const temp = getTemperature(sensor);
      expect(temp).toBe(60);
    });
  });

  describe('Temperature Units', () => {
    it('should store temperature in hundredths of degrees (0.01°C)', () => {
      sensor.setTemperature(25.67);
      const cluster = sensor.getClusterServer(TemperatureMeasurementCluster);
      // Should be stored as 2567 (25.67 * 100)
      expect(cluster.getMeasuredValueAttribute()).toBe(2567);
    });

    it('should handle rounding correctly', () => {
      sensor.setTemperature(25.666);
      const cluster = sensor.getClusterServer(TemperatureMeasurementCluster);
      // Should round to 2567
      expect(cluster.getMeasuredValueAttribute()).toBe(2567);
    });
  });

  describe('Device Initialization', () => {
    it('should initialize with default temperature of 0°C (on time)', () => {
      const temp = getTemperature(sensor);
      expect(temp).toBe(0);
    });

    it('should have Identify cluster', () => {
      const cluster = sensor.getClusterServer(IdentifyCluster);
      expect(cluster).toBeDefined();
      expect(cluster.getIdentifyTimeAttribute()).toBe(0);
    });

    it('should have correct min/max measured values', () => {
      const cluster = sensor.getClusterServer(TemperatureMeasurementCluster);
      expect(cluster.getMinMeasuredValueAttribute()).toBe(-1000); // -10°C (early)
      expect(cluster.getMaxMeasuredValueAttribute()).toBe(5000); // 50°C (max delay)
    });
  });

  describe('Edge Cases', () => {
    it('should handle null delay gracefully', () => {
      expect(() => sensor.setDelayMinutes(null)).not.toThrow();
    });

    it('should handle undefined delay gracefully', () => {
      expect(() => sensor.setDelayMinutes(undefined)).not.toThrow();
    });

    it('should handle NaN temperature gracefully', () => {
      expect(() => sensor.setTemperature(NaN)).not.toThrow();
    });
  });

  describe('Realistic Scenarios', () => {
    it('should represent on-time train as 0°C', () => {
      sensor.setDelayMinutes(0);
      const temp = getTemperature(sensor);
      expect(temp).toBe(0);
    });

    it('should represent slight delay (3 min) as 3°C', () => {
      sensor.setDelayMinutes(3);
      const temp = getTemperature(sensor);
      expect(temp).toBe(3);
    });

    it('should represent moderate delay (10 min) as 10°C', () => {
      sensor.setDelayMinutes(10);
      const temp = getTemperature(sensor);
      expect(temp).toBe(10);
    });

    it('should represent severe delay (25 min) as 25°C', () => {
      sensor.setDelayMinutes(25);
      const temp = getTemperature(sensor);
      expect(temp).toBe(25);
    });

    it('should represent early arrival (-3 min) as -3°C', () => {
      sensor.setDelayMinutes(-3);
      const temp = getTemperature(sensor);
      expect(temp).toBe(-3);
    });
  });
});
