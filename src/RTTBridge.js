import fetch from "node-fetch";
import { TrainStatus, Timing } from "./constants.js";
import { config } from "./config.js";
import { log } from "./logger.js";
import { pickNextService } from "./trainSelection.js";

// Debug helper removed in favor of centralized logger

export const hhmmToMins = t => parseInt(t.slice(0,2), 10)*60 + parseInt(t.slice(2,4), 10);

/**
 * Core business logic for getting train status
 * @param {Object} options
 * @param {string} options.originTiploc - Origin TIPLOC
 * @param {string} options.destTiploc - Destination TIPLOC
 * @param {number} [options.minAfterMinutes] - Minimum minutes after now (default 20)
 * @param {number} [options.windowMinutes] - Window size in minutes (default 60)
 * @param {Date} [options.now] - Current time (defaults to new Date()) - date is extracted from this
 * @param {function} [options.fetchImpl] - Optional fetch implementation for mocking
 * @returns {Promise<{status: string, selected: object, raw: object}>}
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

export const b64 = (u,p) => Buffer.from(`${u}:${p}`).toString("base64");

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
