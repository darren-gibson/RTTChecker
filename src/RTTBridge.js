import fetch from "node-fetch";

export const hhmmToMins = t => parseInt(t.slice(0,2), 10)*60 + parseInt(t.slice(2,4), 10);

export function mapLatenessToState(late) {
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

  // Options: { minAfterMinutes=20, windowMinutes=60, now }
  const minAfterMinutes = Number(opts.minAfterMinutes ?? 20);
  const windowMinutes = Number(opts.windowMinutes ?? 60);
  const now = opts.now ? new Date(opts.now) : new Date();

  // Use UTC-based minutes to keep behaviour consistent when callers pass an ISO UTC date
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const earliest = nowMinutes + minAfterMinutes;
  const latest = earliest + windowMinutes;

  // Helper to parse HHmm or HHMMSS strings into minutes-of-day
  const parseTime = (ts) => {
    if (!ts) return NaN;
    const s = String(ts);
    let hh = 0, mm = 0;
    if (s.length >= 4) {
      hh = parseInt(s.slice(0,2), 10);
      mm = parseInt(s.slice(2,4), 10);
    } else {
      return NaN;
    }
    return hh*60 + mm;
  };

  const candidates = services.map(s => {
    const loc = s.locationDetail || {};
    const depStr = loc.gbttBookedDeparture || loc.realtimeDeparture || loc.gbttBookedDeparture;
    let depMins = parseTime(depStr);
    if (Number.isNaN(depMins)) return null;
    // adjust for day-wrap: if departure earlier than now, assume next day
    if (depMins < nowMinutes) depMins += 24*60;

    if (depMins < earliest || depMins > latest) return null;

    // find the destination entry that matches the provided destCrs (if any)
    const destList = Array.isArray(loc.destination) ? loc.destination : [];
    let destEntry;
    if (destTiploc && destList.length) {
      // strict matching: require exact TIPLOC match
      destEntry = destList.find(d => d.tiploc === destTiploc);
    }
    // If there is no matching destination entry, this service does not go to the requested destination
    if (!destEntry) {
      try {
        const id = s.serviceUid || s.trainIdentity || s.runningIdentity || 'unknown';
        console.warn(`[RTTBridge] excluding service ${id}: no destination TIPLOC ${destTiploc}`);
      } catch (e) {
        // ignore logging errors
      }
      return null;
    }

    // Debug logging: report departure, target-destination arrival, origin/destination and station details
    try {
      const depDisplay = depStr;
      const destArrival = destEntry.publicTime || destEntry.workingTime || loc.realtimeArrival || loc.gbttBookedArrival || 'N/A';
      const originDesc = loc.origin?.[0]?.description || loc.origin?.[0]?.tiploc || 'unknown origin';
      const destDesc = destEntry.description || destEntry.tiploc || 'unknown dest';
      const stationTiploc = loc.tiploc || 'unknown tiploc';
      const platform = loc.platform || 'unknown platform';
      console.debug(`[RTTBridge] candidate dep=${depDisplay} destArrival=${destArrival} origin=${originDesc} dest=${destDesc} station=${stationTiploc} platform=${platform}`);
    } catch (e) {
      // swallow logging errors to avoid breaking selection
    }

    // Try to compute journey duration using origin/destination workingTime or publicTime
    const originTime = loc.origin?.[0]?.workingTime || loc.origin?.[0]?.publicTime || loc.gbttBookedDeparture;
    const destTime = destEntry.workingTime || destEntry.publicTime || loc.gbttBookedArrival || loc.realtimeArrival;
    let duration = NaN;
    const o = parseTime(originTime?.toString?.());
    const d = parseTime(destTime?.toString?.());
    if (!Number.isNaN(o) && !Number.isNaN(d)) {
      duration = d - o;
      if (duration < 0) duration += 24*60; // wrap
    }

    return { service: s, depMins, duration };
  }).filter(Boolean);

  if (candidates.length === 0) return undefined;

  // Prefer the candidate with smallest duration (fastest). If duration is NaN, treat as Infinity.
  candidates.sort((a,b) => {
    const da = Number.isNaN(a.duration) ? Infinity : a.duration;
    const db = Number.isNaN(b.duration) ? Infinity : b.duration;
    if (da !== db) return da - db;
    return a.depMins - b.depMins; // tie-breaker: earlier departure
  });

  return candidates[0].service;
}
