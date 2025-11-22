/**
 * @typedef {import('./types.js').RTTService} RTTService
 * @typedef {import('./types.js').RTTSearchResponse} RTTSearchResponse
 * @typedef {import('./types.js').TrainStatusResult} TrainStatusResult
 */

import fetch from "node-fetch";
import { TrainStatus, Timing } from "./constants.js";
import { config } from "./config.js";
import { log } from "./logger.js";
import { pickNextService } from "./trainSelection.js";

/**
 * Convert HHmm time string to minutes since midnight.
 * @param {string} t - Time string in HHmm format
 * @returns {number} Minutes since midnight
 * @example hhmmToMins("0830") // 510
 */
export const hhmmToMins = t => parseInt(t.slice(0,2), 10)*60 + parseInt(t.slice(2,4), 10);

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
  
  // Extract date from the current time
  const y = currentTime.getFullYear();
  const m = String(currentTime.getMonth() + 1).padStart(2, '0');
  const d = String(currentTime.getDate()).padStart(2, '0');
  const dateStr = `${y}/${m}/${d}`;

  const data = await rttSearch(originTiploc, destTiploc, dateStr, { fetchImpl });
  const svc = pickNextService(data?.services || [], destTiploc, { minAfterMinutes, windowMinutes, now: currentTime });
  if (!svc) {
    return { status: TrainStatus.UNKNOWN, selected: null, raw: data };
  }
  
  const status = calculateOnTimeStatus(svc);
  return { status, selected: svc, raw: data };
}

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

/**
 * Encode credentials for HTTP Basic Authentication.
 * @param {string} u - Username
 * @param {string} p - Password
 * @returns {string} Base64-encoded credentials
 */
export const b64 = (u,p) => Buffer.from(`${u}:${p}`).toString("base64");

/**
 * Search RTT API for train services between two locations.
 * 
 * @param {string} from - Origin TIPLOC code
 * @param {string} to - Destination TIPLOC code
 * @param {string} date - Date in YYYY/MM/DD format
 * @param {Object} [options] - Additional options
 * @param {string} [options.user] - RTT API username (defaults to config)
 * @param {string} [options.pass] - RTT API password (defaults to config)
 * @param {Function} [options.fetchImpl] - Custom fetch implementation for testing
 * @returns {Promise<RTTSearchResponse>} RTT API response with services array
 * @throws {Error} If from/to TIPLOCs are missing or API request fails
 */
export async function rttSearch(from, to, date, { user, pass, fetchImpl } = {}) {
  if (!from || !to) throw new Error('rttSearch requires both from and to TIPLOC');
  const RTT_USER = user || config.rtt.user;
  const RTT_PASS = pass || config.rtt.pass;
  const url = `https://api.rtt.io/api/v1/json/search/${from}/to/${to}/${date}`;
  log.debug(`[RTTBridge] GET ${url}`);
  const res = await (fetchImpl || fetch)(url, { headers: { Authorization: `Basic ${b64(RTT_USER, RTT_PASS)}` } });
  log.debug(`[RTTBridge] Response: ${res.status}`);
  if (!res.ok) throw new Error(`RTT ${res.status}`);
  return res.json();
}

// pickNextService now imported from trainSelection.js and re-exported here for backward compatibility
export { pickNextService };
