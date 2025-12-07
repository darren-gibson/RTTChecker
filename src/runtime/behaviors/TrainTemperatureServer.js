import { TemperatureMeasurementServer } from '@matter/main/behaviors/temperature-measurement';

import { loggers } from '../../utils/logger.js';

const log = loggers.matter;

/**
 * Custom Temperature Measurement Behavior
 * Allows updating temperature from external source (train delay)
 *
 * This behavior maps train delay minutes to temperature values in Celsius,
 * providing a visual representation of delays in Google Home.
 *
 * Mapping:
 * - Delay minutes are clamped between -10 and 50
 * - Temperature is stored in hundredths of degrees (0.01°C units)
 * - Null delay sets measuredValue to null (unknown)
 */
export class TrainTemperatureServer extends TemperatureMeasurementServer {
  async initialize() {
    log.debug('Initializing TrainTemperatureServer...');
    this.state.minMeasuredValue = -1000; // -10.00°C
    this.state.maxMeasuredValue = 5000; // 50.00°C
    this.state.measuredValue = null; // unknown until first update
    await super.initialize?.();
    log.debug('Initialized TrainTemperatureServer');
  }

  /**
   * Explicitly expose the "no service" sentinel temperature of 50°C.
   * This bypasses delayMinutes mapping so controllers can distinguish
   * between on-time (0°C) and no-service (50°C - max delay).
   */
  async setNoServiceTemperature() {
    await this.setMeasuredValue(50 * 100);
  }

  /**
   * Update temperature based on train delay in minutes
   * @param {number|null} delayMinutes - Train delay in minutes, or null for unknown
   */
  async setDelayMinutes(delayMinutes) {
    if (delayMinutes == null) {
      // Unknown delay → expose unknown temperature by setting measuredValue to null
      await this.setMeasuredValue(null);
      return;
    }
    const tempCelsius = Math.min(Math.max(delayMinutes, -10), 50);
    const tempValue = Math.round(tempCelsius * 100);
    await this.setMeasuredValue(tempValue);
  }

  /**
   * Set temperature directly in Celsius
   * @param {number} tempCelsius - Temperature in degrees Celsius
   */
  async setTemperature(tempCelsius) {
    const tempValue = Math.round(tempCelsius * 100);
    await this.setMeasuredValue(tempValue);
  }

  /**
   * Set the measured temperature value
   * @param {number|null} value - Temperature in hundredths of degrees, or null for unknown
   */
  async setMeasuredValue(value) {
    this.state.measuredValue = value;
  }
}
