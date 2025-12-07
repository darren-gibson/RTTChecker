/**
 * Domain logic for train status calculation.
 * Pure business logic without external dependencies.
 */

import { TrainStatus, TrainStatusType, Timing } from '../constants.js';
import { hhmmToMins } from '../utils/timeUtils.js';
import type { RTTService } from '../api/rttApiClient.js';

interface LocationDetail {
  cancelReasonCode?: string;
  realtimeGbttDepartureLateness?: number;
  realtimeWttDepartureLateness?: number;
  gbttBookedDeparture?: string;
  realtimeDeparture?: string;
}

/**
 * Calculate on-time status based on service lateness.
 * Maps lateness in minutes to categorical status (on_time, minor_delay, etc.).
 *
 * @param service - Train service with location and timing details
 * @returns Status constant from TrainStatus enum
 */
export function calculateOnTimeStatus(service: RTTService | null | undefined): TrainStatusType {
  if (!service) return TrainStatus.UNKNOWN;
  const loc: LocationDetail = (service.locationDetail || service) as LocationDetail;
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
