/**
 * @typedef {import('./types.js').StatusChangeEvent} StatusChangeEvent
 * @typedef {import('./types.js').RTTService} RTTService
 * @typedef {import('./types.js').RTTSearchResponse} RTTSearchResponse
 */

import { EventEmitter } from 'events';
import { TrainStatus, MatterDevice as MatterConstants, Timing } from "./constants.js";
import { config } from "./config.js";
import { getTrainStatus } from "./RTTBridge.js";
import { loggers } from "./logger.js";
import { RTTApiError, NoTrainFoundError, RTTCheckerError } from "./errors.js";

const log = loggers.rtt;

/**
 * Matter device implementation for Train Status Monitor.
 * Uses Mode Select cluster to report train punctuality status.
 * 
 * Emits 'statusChange' events with normalized payload containing:
 * - timestamp, previousMode, currentMode, modeChanged
 * - trainStatus, selectedService, raw, error
 * 
 * @extends EventEmitter
 * @fires TrainStatusDevice#statusChange
 */

// Map TrainStatus to Matter mode numbers
const STATUS_TO_MODE = {
  [TrainStatus.ON_TIME]: MatterConstants.Modes.ON_TIME.mode,
  [TrainStatus.MINOR_DELAY]: MatterConstants.Modes.MINOR_DELAY.mode,
  [TrainStatus.DELAYED]: MatterConstants.Modes.DELAYED.mode,
  [TrainStatus.MAJOR_DELAY]: MatterConstants.Modes.MAJOR_DELAY.mode,
  [TrainStatus.UNKNOWN]: MatterConstants.Modes.UNKNOWN.mode
};

/**
 * TrainStatusDevice class
 * Implements a Matter device with Mode Select cluster for train status monitoring
 */
export class TrainStatusDevice extends EventEmitter {
  constructor() {
    super();
    this.currentMode = MatterConstants.Modes.UNKNOWN.mode;
    this.updateInterval = null;
    this.updateIntervalMs = Number(process.env.UPDATE_INTERVAL_MS || 60000); // Default 1 minute
  }

  /**
   * Get all supported modes for the Mode Select cluster
   */
  getSupportedModes() {
    return [
      MatterConstants.Modes.ON_TIME,
      MatterConstants.Modes.MINOR_DELAY,
      MatterConstants.Modes.DELAYED,
      MatterConstants.Modes.MAJOR_DELAY,
      MatterConstants.Modes.UNKNOWN
    ];
  }

  /**
   * Get current mode
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * Update train status from RTT API and emit statusChange event.
   * 
   * Polls RTT API for train status, maps to Matter mode, and emits
   * normalized statusChange event with all fields (never undefined).
   * 
   * @async
   * @returns {Promise<void>}
   * @emits statusChange
   * 
   * @example
   * device.on('statusChange', (event) => {
   *   console.log(event.currentMode);       // Always present
   *   console.log(event.selectedService);   // RTTService or null
   *   console.log(event.error);             // Error or null
   * });
   */
  async updateTrainStatus() {
    const timestamp = new Date();
    try {
      const result = await getTrainStatus({
        originTiploc: config.train.originTiploc,
        destTiploc: config.train.destTiploc,
        minAfterMinutes: config.train.minAfterMinutes,
        windowMinutes: config.train.windowMinutes,
        now: timestamp
      });

      const newMode = STATUS_TO_MODE[result.status] ?? MatterConstants.Modes.UNKNOWN.mode;
      const modeChanged = newMode !== this.currentMode;
      
      if (modeChanged) {
        const previousMode = this.currentMode;
        log.info(`🔄 Train status changed: ${previousMode} -> ${newMode} (${result.status})`);
        this.currentMode = newMode;
        
        // Emit normalized event payload
        this.emit('statusChange', {
          timestamp,
          previousMode,
          currentMode: newMode,
          modeChanged: true,
          trainStatus: result.status,
          selectedService: result.selected || null,
          raw: result.raw || null,
          error: null
        });
      }

      return result;
    } catch (error) {
      // Enhanced error logging with context
      if (error instanceof RTTApiError) {
        if (error.isAuthError()) {
          log.error('❌ RTT API authentication failed. Check RTT_USER and RTT_PASS credentials.');
        } else if (error.isRetryable()) {
          log.warn(`⚠️  RTT API temporarily unavailable (${error.statusCode}). Will retry on next update.`);
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
      const modeChanged = previousMode !== this.currentMode;
      
      if (modeChanged) {
        this.emit('statusChange', {
          timestamp,
          previousMode,
          currentMode: this.currentMode,
          modeChanged: true,
          trainStatus: TrainStatus.UNKNOWN,
          selectedService: null,
          raw: null,
          error: error.message
        });
      }
      
      throw error;
    }
  }

  /**
   * Start periodic train status updates.
   * Interval controlled by UPDATE_INTERVAL_MS env var (default 60000ms).
   * 
   * @returns {void}
   */
  startPeriodicUpdates() {
  log.debug('🔁 Triggering initial train status fetch...');
    // Update immediately
    this.updateTrainStatus().catch(err => {
      log.error('Initial train status update failed:', err);
    });

    // Then update on interval
    this.updateInterval = setInterval(() => {
    log.debug('⏱️ Periodic train status fetch...');
      this.updateTrainStatus().catch(err => {
        log.error('Periodic train status update failed:', err);
      });
    }, this.updateIntervalMs);

  log.info(`Started periodic updates every ${this.updateIntervalMs}ms`);
  }

  /**
   * Stop periodic train status updates.
   * Clears the update interval timer.
   * 
   * @returns {void}
   */
  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
  log.info('Stopped periodic updates');
    }
  }

  /**
   * Get device metadata
   */
  getDeviceInfo() {
    return {
      deviceName: config.matter.deviceName,
      vendorName: config.matter.vendorName,
      productName: config.matter.productName,
      serialNumber: config.matter.serialNumber,
      vendorId: MatterConstants.VendorId,
      productId: MatterConstants.ProductId,
      deviceType: MatterConstants.DeviceType
    };
  }
}
