/**
 * Domain logic for train status calculation.
 * Pure business logic without external dependencies.
 * 
 * @typedef {import('../types.js').RTTService} RTTService
 * @typedef {import('../types.js').RTTLocation} RTTLocation
 */

import { TrainStatus, Timing } from "../constants.js";
import { hhmmToMins } from "../utils/timeUtils.js";

/**
 * Calculate on-time status based on service lateness.
 * Maps lateness in minutes to categorical status (on_time, minor_delay, etc.).
 * 
 * @param {RTTService} service - Train service with location and timing details
 * @returns {string} Status constant from TrainStatus enum
 */
export function calculateOnTimeStatus(service) {
  if (!service) return TrainStatus.UNKNOWN;
  const loc = service.locationDetail || service;
  if (loc.cancelReasonCode) return TrainStatus.MAJOR_DELAY;

  // Derive lateness: prefer explicit fields, fallback to booked vs realtime
  let late = Number(loc.realtimeGbttDepartureLateness ?? loc.realtimeWttDepartureLateness);
  if (isNaN(late) && loc.gbttBookedDeparture && loc.realtimeDeparture) {
    late = hhmmToMins(loc.realtimeDeparture) - hhmmToMins(loc.gbttBookedDeparture);
  }
  if (isNaN(late) || late == null) late = 0;
  const a = Math.abs(late);
  const T = Timing.LATE_THRESHOLDS;
  if (a <= T.ON_TIME) return TrainStatus.ON_TIME;
  if (a <= T.MINOR) return TrainStatus.MINOR_DELAY;
  if (a <= T.DELAYED) return TrainStatus.DELAYED;
  return TrainStatus.MAJOR_DELAY;
}
