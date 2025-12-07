import { TemperatureMeasurementServer } from '@matter/main/behaviors/temperature-measurement';

import {
  BaseBehaviorHelper,
  TemperatureConstants,
  celsiusToMeasuredValue,
  clampDelay,
} from './baseBehaviorHelpers.js';

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
  override async initialize() {
    await BaseBehaviorHelper.wrapInitialize('TrainTemperatureServer', async () => {
      this.state.minMeasuredValue = TemperatureConstants.MIN_MEASURED_VALUE;
      this.state.maxMeasuredValue = TemperatureConstants.MAX_MEASURED_VALUE;
      this.state.measuredValue = null; // unknown until first update
      await super.initialize?.();
    });
  }

  /**
   * Explicitly expose the "no service" sentinel temperature of 50°C.
   * This bypasses delayMinutes mapping so controllers can distinguish
   * between on-time (0°C) and no-service (50°C - max delay).
   */
  async setNoServiceTemperature(): Promise<void> {
    await this.setMeasuredValue(TemperatureConstants.NO_SERVICE_SENTINEL);
  }

  /**
   * Update temperature based on train delay in minutes
   */
  async setDelayMinutes(delayMinutes: number | null): Promise<void> {
    if (delayMinutes == null) {
      // Unknown delay → expose unknown temperature by setting measuredValue to null
      await this.setMeasuredValue(null);
      return;
    }
    const tempCelsius = clampDelay(delayMinutes);
    const tempValue = celsiusToMeasuredValue(tempCelsius);
    await this.setMeasuredValue(tempValue);
  }

  /**
   * Set temperature directly in Celsius
   */
  async setTemperature(tempCelsius: number): Promise<void> {
    const tempValue = celsiusToMeasuredValue(tempCelsius);
    await this.setMeasuredValue(tempValue);
  }

  /**
   * Set the measured temperature value
   */
  async setMeasuredValue(value: number | null): Promise<void> {
    (this as any).state.measuredValue = value;
  }
}
