/**
 * @typedef {import('../types.js').RTTService} RTTService
 * @typedef {import('../types.js').TrainStatusResult} TrainStatusResult
 */

import { TrainStatus } from "../constants.js";
import { rttSearch } from "../api/rttApiClient.js";
import { calculateOnTimeStatus } from "../domain/trainStatus.js";
import { formatDateYMD } from "../utils/timeUtils.js";

import { pickNextService } from "./trainSelectionService.js";

/**
 * Core business logic for getting train status from RTT API.
 * Searches for trains from origin to destination, selects the next appropriate service,
 * and calculates on-time status based on delays.
 * 
 * @param {Object} options - Search and filtering options
 * @param {string} options.originTiploc - Origin TIPLOC code (e.g., "CAMBDGE")
 * @param {string} options.destTiploc - Destination TIPLOC code (e.g., "KNGX")
 * @param {number} [options.minAfterMinutes=20] - Minimum minutes after now to search
 * @param {number} [options.windowMinutes=60] - Search window size in minutes
 * @param {Date} [options.now] - Current time (defaults to new Date())
 * @param {Function} [options.fetchImpl] - Optional fetch implementation for testing
 * @returns {Promise<TrainStatusResult>} Train status result with selected service
 */
export async function getTrainStatus({
  originTiploc,
  destTiploc,
  minAfterMinutes = 20,
  windowMinutes = 60,
  now,
  fetchImpl
}) {
  // Default to current time if not provided
  const currentTime = now || new Date();
  const dateStr = formatDateYMD(currentTime);

  const data = await rttSearch(originTiploc, destTiploc, dateStr, { fetchImpl });
  const svc = pickNextService(data?.services || [], destTiploc, { minAfterMinutes, windowMinutes, now: currentTime });
  if (!svc) {
    return { status: TrainStatus.UNKNOWN, selected: null, raw: data };
  }
  
  const status = calculateOnTimeStatus(svc);
  return { status, selected: svc, raw: data };
}

// Export for convenience
export { calculateOnTimeStatus };
