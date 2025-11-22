import fetch from "node-fetch";
import { TrainStatus } from "./constants.js";
import { config } from "./config.js";

// Simple debug logger (only prints when LOG_LEVEL=debug)
const isDebug = (process.env.LOG_LEVEL || '').toLowerCase() === 'debug';
function logDebug(msg) { if (isDebug) console.log(msg); }

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
  
  // If cancelled, always return 'major delay'
  if (loc.cancelReasonCode) {
    return TrainStatus.MAJOR_DELAY;
  }
  
  // Calculate lateness from departure times
  let late = Number(loc.realtimeGbttDepartureLateness ?? loc.realtimeWttDepartureLateness);
  
  // If lateness field not provided (future trains), calculate from booked vs realtime times
  if (isNaN(late) && loc.gbttBookedDeparture && loc.realtimeDeparture) {
    const bookedMins = hhmmToMins(loc.gbttBookedDeparture);
    const realtimeMins = hhmmToMins(loc.realtimeDeparture);
    late = realtimeMins - bookedMins;
  }
  
  // Default to 0 if still no lateness info
  if (isNaN(late) || late == null) late = 0;
  
  const a = Math.abs(late);
  if (a <= 2) return TrainStatus.ON_TIME;
  if (a <= 5) return TrainStatus.MINOR_DELAY;
  if (a <= 10) return TrainStatus.DELAYED;
  return TrainStatus.MAJOR_DELAY;
}

export const b64 = (u,p) => Buffer.from(`${u}:${p}`).toString("base64");

export async function rttSearch(from, to, date, { user, pass, fetchImpl } = {}) {
  if (!from || !to) throw new Error('rttSearch requires both from and to TIPLOC');
  const RTT_USER = user || config.rtt.user;
  const RTT_PASS = pass || config.rtt.pass;
  const url = `https://api.rtt.io/api/v1/json/search/${from}/to/${to}/${date}`;
  logDebug(`[RTTBridge][debug] GET ${url}`);
  const res = await (fetchImpl || fetch)(url, { headers: { Authorization: `Basic ${b64(RTT_USER, RTT_PASS)}` } });
  logDebug(`[RTTBridge][debug] Response: ${res.status}`);
  if (!res.ok) throw new Error(`RTT ${res.status}`);
  return res.json();
}

export function pickNextService(services, destTiploc, opts = {}) {
  if (!Array.isArray(services)) return undefined;

  const minAfterMinutes = Number(opts.minAfterMinutes ?? 20);
  const windowMinutes = Number(opts.windowMinutes ?? 60);
  const now = opts.now ? new Date(opts.now) : new Date();

  // Use local time (respects BST/GMT in the UK)
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const earliest = nowMinutes + minAfterMinutes;
  const latest = earliest + windowMinutes;

  const parseTime = (ts) => {
    if (!ts) return NaN;
    const s = String(ts);
    if (s.length < 4) return NaN;
    return parseInt(s.slice(0,2), 10) * 60 + parseInt(s.slice(2,4), 10);
  };

  const logCandidate = (depStr, destEntry, loc, isSelected = false) => {
    if (!isDebug) return; // only emit candidate logs in debug mode
    try {
      const destArrival = destEntry.publicTime || destEntry.workingTime || loc.realtimeArrival || loc.gbttBookedArrival || 'N/A';
      const originDesc = loc.origin?.[0]?.description || loc.origin?.[0]?.tiploc || 'unknown';
      const destDesc = destEntry.description || destEntry.tiploc || 'unknown';
      const platform = loc.platform || '?';
      const prefix = isSelected ? 'SELECTED' : 'candidate';
      logDebug(`[RTTBridge][debug] ${prefix}: dep=${depStr} arr=${destArrival} ${originDesc}→${destDesc} platform=${platform}`);
    } catch (e) {
      /* ignore */
    }
  };

  const candidates = services.map(s => {
    const loc = s.locationDetail || {};
    const depStr = loc.gbttBookedDeparture || loc.realtimeDeparture;
    let depMins = parseTime(depStr);
    if (Number.isNaN(depMins)) return null;
    
    // Adjust for day-wrap: if departure earlier than now, assume next day
    if (depMins < nowMinutes) depMins += 24*60;
    if (depMins < earliest || depMins > latest) return null;

    // Find destination entry with exact TIPLOC match
    const destList = Array.isArray(loc.destination) ? loc.destination : [];
    const destEntry = destTiploc ? destList.find(d => d.tiploc === destTiploc) : null;
    
    if (!destEntry) {
      const id = s.serviceUid || s.trainIdentity || s.runningIdentity || 'unknown';
      console.warn(`[RTTBridge] excluding service ${id}: no destination TIPLOC ${destTiploc}`);
      return null;
    }

    logCandidate(depStr, destEntry, loc);

    // Compute journey duration
    const originTime = loc.origin?.[0]?.workingTime || loc.origin?.[0]?.publicTime || loc.gbttBookedDeparture;
    const destTime = destEntry.workingTime || destEntry.publicTime || loc.gbttBookedArrival || loc.realtimeArrival;
    const o = parseTime(originTime?.toString?.());
    const d = parseTime(destTime?.toString?.());
    let duration = NaN;
    if (!Number.isNaN(o) && !Number.isNaN(d)) {
      duration = d - o;
      if (duration < 0) duration += 24*60;
    }

    return { service: s, depMins, duration, depStr, destEntry, loc };
  }).filter(Boolean);

  if (candidates.length === 0) {
    // Always emit an info-level log (not gated by LOG_LEVEL) so users know why status stays UNKNOWN
    try {
      console.log(`[RTTBridge] info: no candidate service found (origin=${config.train.originTiploc} dest=${destTiploc} minAfter=${minAfterMinutes} window=${windowMinutes})`);
    } catch (_) { /* ignore logging errors */ }
    return undefined;
  }

  // Sort by arrival time at destination (earliest first), then by departure time
  candidates.sort((a, b) => {
    const aArr = (() => {
      const t = a.destEntry.workingTime || a.destEntry.publicTime || a.loc.gbttBookedArrival || a.loc.realtimeArrival;
      return parseTime(t?.toString?.());
    })();
    const bArr = (() => {
      const t = b.destEntry.workingTime || b.destEntry.publicTime || b.loc.gbttBookedArrival || b.loc.realtimeArrival;
      return parseTime(t?.toString?.());
    })();
    if (aArr !== bArr) return aArr - bArr;
    return a.depMins - b.depMins;
  });

  const selected = candidates[0];
  logCandidate(selected.depStr, selected.destEntry, selected.loc, true);
  
  return selected.service;
}
