/**
 * Status mapping utilities for TrainStatusDevice
 * Maps domain train status to Matter mode numbers
 * @module devices/statusMapping
 */

import {
  TrainStatus,
  type TrainStatusType,
  MatterDevice as MatterConstants,
} from '../constants.js';

/**
 * Map TrainStatus to Matter mode numbers
 */
export const STATUS_TO_MODE: Record<TrainStatusType, number> = {
  [TrainStatus.ON_TIME]: MatterConstants.Modes.ON_TIME.mode,
  [TrainStatus.MINOR_DELAY]: MatterConstants.Modes.MINOR_DELAY.mode,
  [TrainStatus.DELAYED]: MatterConstants.Modes.DELAYED.mode,
  [TrainStatus.MAJOR_DELAY]: MatterConstants.Modes.MAJOR_DELAY.mode,
  [TrainStatus.UNKNOWN]: MatterConstants.Modes.UNKNOWN.mode,
};

/**
 * Convert train status to Matter mode number
 *
 * @param status - Train status type
 * @returns Matter mode number
 */
export function statusToMode(status: TrainStatusType): number {
  return STATUS_TO_MODE[status] ?? MatterConstants.Modes.UNKNOWN.mode;
}

/**
 * Get all supported Matter modes for train status
 *
 * @returns Array of supported modes with labels
 */
export function getSupportedModes(): Array<{ mode: number; label: string }> {
  return [
    MatterConstants.Modes.ON_TIME,
    MatterConstants.Modes.MINOR_DELAY,
    MatterConstants.Modes.DELAYED,
    MatterConstants.Modes.MAJOR_DELAY,
    MatterConstants.Modes.UNKNOWN,
  ];
}
