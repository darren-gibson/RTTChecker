/**
 * @typedef {import('../types.js').StatusChangeEvent} StatusChangeEvent
 * @typedef {import('../types.js').RTTService} RTTService
 * @typedef {import('../types.js').RTTSearchResponse} RTTSearchResponse
 */

import { EventEmitter } from 'events';

import { TrainStatus, MatterDevice as MatterConstants } from '../constants.js';
import { config } from '../config.js';
import { getTrainStatus } from '../services/trainStatusService.js';
import { loggers } from '../utils/logger.js';
import { RTTCheckerError } from '../errors.js';
import { RTTApiError } from '../api/errors.js';
import { NoTrainFoundError } from '../domain/errors.js';

const log = loggers.rtt;

// Map TrainStatus to Matter mode numbers
const STATUS_TO_MODE = {
  [TrainStatus.ON_TIME]: MatterConstants.Modes.ON_TIME.mode,
  [TrainStatus.MINOR_DELAY]: MatterConstants.Modes.MINOR_DELAY.mode,
  [TrainStatus.DELAYED]: MatterConstants.Modes.DELAYED.mode,
  [TrainStatus.MAJOR_DELAY]: MatterConstants.Modes.MAJOR_DELAY.mode,
  [TrainStatus.UNKNOWN]: MatterConstants.Modes.UNKNOWN.mode,
};

/**
 * TrainStatusDevice class
 * Implements a Matter device with Mode Select cluster for train status monitoring
 */
export class TrainStatusDevice extends EventEmitter {
  constructor() {
    super();
    this.currentMode = MatterConstants.Modes.UNKNOWN.mode;
    this.currentDelayMinutes = null;
    this.isFirstUpdate = true;
    this.updateInterval = null;
    this.updateIntervalMs = Number(process.env.UPDATE_INTERVAL_MS || 60000); // Default 1 minute
  }

  getSupportedModes() {
    return [
      MatterConstants.Modes.ON_TIME,
      MatterConstants.Modes.MINOR_DELAY,
      MatterConstants.Modes.DELAYED,
      MatterConstants.Modes.MAJOR_DELAY,
      MatterConstants.Modes.UNKNOWN,
    ];
  }

  getCurrentMode() {
    return this.currentMode;
  }

  async updateTrainStatus() {
    const timestamp = new Date();
    try {
      const result = await getTrainStatus({
        originTiploc: config.train.originTiploc,
        destTiploc: config.train.destTiploc,
        minAfterMinutes: config.train.minAfterMinutes,
        windowMinutes: config.train.windowMinutes,
        now: timestamp,
      });

      const newMode = STATUS_TO_MODE[result.status] ?? MatterConstants.Modes.UNKNOWN.mode;
      const modeChanged = newMode !== this.currentMode;

      // Calculate delay minutes from selected service
      let delayMinutes = null;
      if (result.selected?.locationDetail) {
        const lateness =
          result.selected.locationDetail.realtimeGbttDepartureLateness ??
          result.selected.locationDetail.realtimeWttDepartureLateness;
        if (lateness != null && !isNaN(Number(lateness))) {
          delayMinutes = Number(lateness);
        }
      }
      const delayChanged = delayMinutes !== this.currentDelayMinutes;

      // Emit statusChange if: mode changed, delay changed, or first update
      if (modeChanged || delayChanged || this.isFirstUpdate) {
        const previousMode = this.currentMode;
        if (modeChanged) {
          log.info(`🔄 Train status changed: ${previousMode} -> ${newMode} (${result.status})`);
        }
        this.currentMode = newMode;
        this.currentDelayMinutes = delayMinutes;
        this.isFirstUpdate = false;

        this.emit('statusChange', {
          timestamp,
          previousMode,
          currentMode: newMode,
          modeChanged,
          trainStatus: result.status,
          selectedService: result.selected || null,
          delayMinutes,
          raw: result.raw || null,
          error: null,
        });
      }

      return result;
    } catch (error) {
      if (error instanceof RTTApiError) {
        if (error.isAuthError()) {
          log.error('❌ RTT API authentication failed. Check RTT_USER and RTT_PASS credentials.');
        } else if (error.isRetryable()) {
          log.warn(
            `⚠️  RTT API temporarily unavailable (${error.statusCode}). Will retry on next update.`
          );
        } else {
          log.error(`❌ RTT API error: ${error.message}`, { statusCode: error.statusCode });
        }
      } else if (error instanceof NoTrainFoundError) {
        log.warn(`⚠️  No suitable train found: ${error.message}`);
      } else if (error instanceof RTTCheckerError) {
        log.error(`❌ RTTChecker error: ${error.message}`, error.context);
      } else {
        log.error('❌ Failed to update train status:', error);
      }

      const previousMode = this.currentMode;
      this.currentMode = MatterConstants.Modes.UNKNOWN.mode;
      this.currentDelayMinutes = null;
      const modeChanged = previousMode !== this.currentMode;

      // Always emit on error if mode changed or first update
      if (modeChanged || this.isFirstUpdate) {
        this.isFirstUpdate = false;
        this.emit('statusChange', {
          timestamp,
          previousMode,
          currentMode: this.currentMode,
          modeChanged,
          trainStatus: TrainStatus.UNKNOWN,
          selectedService: null,
          delayMinutes: null,
          raw: null,
          error: error.message,
        });
      }

      throw error;
    }
  }

  startPeriodicUpdates() {
    log.debug('🔁 Triggering initial train status fetch...');
    this.updateTrainStatus().catch((err) => {
      log.error('Initial train status update failed:', err);
    });

    this.updateInterval = setInterval(() => {
      log.debug('⏱️ Periodic train status fetch...');
      this.updateTrainStatus().catch((err) => {
        log.error('Periodic train status update failed:', err);
      });
    }, this.updateIntervalMs);

    log.info(`Started periodic updates every ${this.updateIntervalMs}ms`);
  }

  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      log.info('Stopped periodic updates');
    }
  }

  getDeviceInfo() {
    return {
      deviceName: config.matter.deviceName,
      vendorName: config.matter.vendorName,
      productName: config.matter.productName,
      serialNumber: config.matter.serialNumber,
      vendorId: MatterConstants.VendorId,
      productId: MatterConstants.ProductId,
      deviceType: MatterConstants.DeviceType,
    };
  }
}
