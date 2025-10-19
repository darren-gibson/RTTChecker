import fetch from "node-fetch";

export const hhmmToMins = t => parseInt(t.slice(0,2), 10)*60 + parseInt(t.slice(2,4), 10);

export function calculateOnTimeStatus(service) {
  if (!service) return "unknown";
  
  const loc = service.locationDetail || service;
  
  // If cancelled, always return 'very poor'
  if (loc.cancelReasonCode) {
    return "very poor";
  }
  
  // Calculate lateness from departure times
  const late = Number(loc.realtimeGbttDepartureLateness ?? loc.realtimeWttDepartureLateness ?? 0);
  if (late == null) return "unknown";
  
  const a = Math.abs(late);
  if (a <= 2) return "good";
  if (a <= 5) return "fair";
  if (a <= 10) return "poor";
  return "very poor";
}

export const b64 = (u,p) => Buffer.from(`${u}:${p}`).toString("base64");

export async function rttSearch(from, to, date, { user, pass, fetchImpl } = {}) {
  if (!from || !to) throw new Error('rttSearch requires both from and to TIPLOC');
  const RTT_USER = user || process.env.RTT_USER;
  const RTT_PASS = pass || process.env.RTT_PASS;
  const url = `https://api.rtt.io/api/v1/json/search/${from}/to/${to}/${date}`;
  const res = await (fetchImpl || fetch)(url, { headers: { Authorization: `Basic ${b64(RTT_USER, RTT_PASS)}` } });
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
    try {
      const destArrival = destEntry.publicTime || destEntry.workingTime || loc.realtimeArrival || loc.gbttBookedArrival || 'N/A';
      const originDesc = loc.origin?.[0]?.description || loc.origin?.[0]?.tiploc || 'unknown';
      const destDesc = destEntry.description || destEntry.tiploc || 'unknown';
      const platform = loc.platform || '?';
      const prefix = isSelected ? 'SELECTED' : 'candidate';
      console.log(`[RTTBridge] ${prefix}: dep=${depStr} arr=${destArrival} ${originDesc}→${destDesc} platform=${platform}`);
    } catch (e) {
      // ignore logging errors
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

  if (candidates.length === 0) return undefined;

  // Sort by duration (fastest first), then by departure time
  candidates.sort((a,b) => {
    const da = Number.isNaN(a.duration) ? Infinity : a.duration;
    const db = Number.isNaN(b.duration) ? Infinity : b.duration;
    if (da !== db) return da - db;
    return a.depMins - b.depMins;
  });

  const selected = candidates[0];
  logCandidate(selected.depStr, selected.destEntry, selected.loc, true);
  
  return selected.service;
}
