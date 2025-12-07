import { EventEmitter } from 'events';

import { TrainStatus, type TrainStatusType, MatterDevice as MatterConstants } from '../constants.js';
import { config } from '../config.js';
import { getTrainStatus } from '../services/trainStatusService.js';
import { loggers } from '../utils/logger.js';
import { RTTCheckerError } from '../errors.js';
import { RTTApiError } from '../api/errors.js';
import { NoTrainFoundError } from '../domain/errors.js';
import type { RTTService, RTTSearchResponse } from '../api/rttApiClient.js';

export interface StatusChangeEvent {
  timestamp: Date;
  previousMode: number;
  currentMode: number;
  modeChanged: boolean;
  trainStatus: TrainStatusType;
  selectedService: RTTService | null;
  delayMinutes: number | null;
  raw: RTTSearchResponse | null;
  error: string | null;
}

export interface DeviceInfo {
  deviceName: string;
  vendorName: string;
  productName: string;
  serialNumber: string;
  vendorId: number;
  productId: number;
  deviceType: number;
}

const log = loggers.rtt;

// Map TrainStatus to Matter mode numbers
const STATUS_TO_MODE: Record<TrainStatusType, number> = {
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
  private currentMode: number;
  private currentDelayMinutes: number | null;
  private isFirstUpdate: boolean;
  private updateInterval: NodeJS.Timeout | null;
  private readonly updateIntervalMs: number;

  constructor() {
    super();
    this.currentMode = MatterConstants.Modes.UNKNOWN.mode;
    this.currentDelayMinutes = null;
    this.isFirstUpdate = true;
    this.updateInterval = null;
    const env = process.env as Record<string, string | undefined>;
    this.updateIntervalMs = Number(env['UPDATE_INTERVAL_MS'] || 60000); // Default 1 minute
  }

  getSupportedModes(): Array<{ mode: number; label: string }> {
    return [
      MatterConstants.Modes.ON_TIME,
      MatterConstants.Modes.MINOR_DELAY,
      MatterConstants.Modes.DELAYED,
      MatterConstants.Modes.MAJOR_DELAY,
      MatterConstants.Modes.UNKNOWN,
    ];
  }

  getCurrentMode(): number {
    return this.currentMode;
  }

  async updateTrainStatus(): Promise<{ status: TrainStatusType; selected: RTTService | null; raw: RTTSearchResponse | null }> {
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

  startPeriodicUpdates(): void {
    log.debug('🔁 Triggering initial train status fetch...');
    this.updateTrainStatus().catch((err: Error) => {
      log.error('Initial train status update failed:', err);
    });

    this.updateInterval = setInterval(() => {
      log.debug('⏱️ Periodic train status fetch...');
      this.updateTrainStatus().catch((err: Error) => {
        log.error('Periodic train status update failed:', err);
      });
    }, this.updateIntervalMs);

    log.info(`Started periodic updates every ${this.updateIntervalMs}ms`);
  }

  stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      log.info('Stopped periodic updates');
    }
  }

  getDeviceInfo(): DeviceInfo {
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
