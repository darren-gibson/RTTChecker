import { EventEmitter } from 'events';
import { TrainStatus, MatterDevice as MatterConstants, Timing } from "./constants.js";
import { config } from "./config.js";
import { getTrainStatus } from "./RTTBridge.js";
import { log } from "./logger.js";

// Centralized debug via logger

/**
 * Matter device implementation for Train Status Monitor
 * Uses Mode Select cluster to report train punctuality status
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
   * Update train status from RTT API
   */
  async updateTrainStatus() {
    try {
      const result = await getTrainStatus({
        originTiploc: config.train.originTiploc,
        destTiploc: config.train.destTiploc,
        minAfterMinutes: config.train.minAfterMinutes,
        windowMinutes: config.train.windowMinutes,
        now: new Date()
      });

      const newMode = STATUS_TO_MODE[result.status] ?? MatterConstants.Modes.UNKNOWN.mode;
      
      if (newMode !== this.currentMode) {
        const previousMode = this.currentMode;
  log.info(`🔄 Train status changed: ${previousMode} -> ${newMode} (${result.status})`);
        this.currentMode = newMode;
        
        // Emit event for Matter server
        this.emit('statusChange', {
          previousMode,
          currentMode: newMode,
          trainStatus: result.status,
          selectedService: result.selected
        });
      }

      return result;
    } catch (error) {
  log.error('❌ Failed to update train status:', error);
      const previousMode = this.currentMode;
      this.currentMode = MatterConstants.Modes.UNKNOWN.mode;
      
      if (previousMode !== this.currentMode) {
        this.emit('statusChange', {
          previousMode,
          currentMode: this.currentMode,
          error: error.message
        });
      }
      
      throw error;
    }
  }

  /**
   * Start periodic updates
   */
  startPeriodicUpdates() {
  log.debug('🔁 Triggering initial train status fetch...');
    // Update immediately
    this.updateTrainStatus().catch(err => {
      console.error('Initial train status update failed:', err);
    });

    // Then update on interval
    this.updateInterval = setInterval(() => {
    log.debug('⏱️ Periodic train status fetch...');
      this.updateTrainStatus().catch(err => {
        console.error('Periodic train status update failed:', err);
      });
    }, this.updateIntervalMs);

  log.info(`Started periodic updates every ${this.updateIntervalMs}ms`);
  }

  /**
   * Stop periodic updates
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
