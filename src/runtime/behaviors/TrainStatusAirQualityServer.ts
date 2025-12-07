import { AirQualityServer } from '@matter/main/behaviors/air-quality';
import type { TrainStatusType } from '../../constants.js';

import { STATUS_TO_AIR_QUALITY } from '../../domain/airQualityMapping.js';
import { loggers } from '../../utils/logger.js';

import { BaseBehaviorHelper } from './baseBehaviorHelpers.js';

const log = loggers.matter;

/**
 * Custom Air Quality Behavior
 * Maps train punctuality to air quality levels for color-coded status visualization
 *
 * Status Mapping:
 * - On Time (0-2 mins)     → Good (1) - Green
 * - Minor Delay (3-5 mins) → Fair (2) - Yellow
 * - Delayed (6-10 mins)    → Moderate (3) - Orange
 * - Major Delay (11+ mins) → Poor (4) - Red
 * - Unknown/Critical       → VeryPoor (5) - Dark Red
 *
 * This provides an intuitive color-coded visualization in Google Home:
 * - Better air quality = Better train service
 * - Worse air quality = Worse train punctuality
 */
export class TrainStatusAirQualityServer extends AirQualityServer {
  override async initialize() {
    await BaseBehaviorHelper.wrapInitialize('TrainStatusAirQualityServer', async () => {
      // Start with Unknown (0) until first status update
      this.state.airQuality = 0; // AirQualityEnum.Unknown
      await super.initialize?.();
    });
  }

  /**
   * Update air quality based on train status code
   */
  async setTrainStatus(statusCode: TrainStatusType | 'critical'): Promise<void> {
    const airQualityValue = STATUS_TO_AIR_QUALITY[statusCode] ?? 0; // Default to Unknown
    await this.setAirQuality(airQualityValue);
  }

  /**
   * Set air quality value directly
   */
  async setAirQuality(value: number): Promise<void> {
    log.debug(`Setting air quality to: ${value}`);
    this.state.airQuality = value;
  }
}
