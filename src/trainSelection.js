import { log } from './logger.js';
import { config } from './config.js';

// Parse HHmm time string to minutes since midnight
export function parseTime(ts) {
  if (!ts) return NaN;
  const s = String(ts);
  if (s.length < 4) return NaN;
  return parseInt(s.slice(0,2), 10) * 60 + parseInt(s.slice(2,4), 10);
}

function normalizeDepartureMinutes(depMins, nowMinutes) {
  if (Number.isNaN(depMins)) return depMins;
  // Day wrap: if departure earlier than now, treat as next day
  if (depMins < nowMinutes) return depMins + 24*60;
  return depMins;
}

function withinWindow(depMins, earliest, latest) {
  return depMins >= earliest && depMins <= latest;
}

function findDestinationEntry(loc, destTiploc) {
  const destList = Array.isArray(loc.destination) ? loc.destination : [];
  return destList.find(d => d.tiploc === destTiploc);
}

function buildCandidate(service, destEntry, loc, depMins, depStr) {
  // Compute journey duration (origin to destination)
  const originTime = loc.origin?.[0]?.workingTime || loc.origin?.[0]?.publicTime || loc.gbttBookedDeparture;
  const destTime = destEntry.workingTime || destEntry.publicTime || loc.gbttBookedArrival || loc.realtimeArrival;
  const o = parseTime(originTime?.toString?.());
  const d = parseTime(destTime?.toString?.());
  let duration = NaN;
  if (!Number.isNaN(o) && !Number.isNaN(d)) {
    duration = d - o;
    if (duration < 0) duration += 24*60; // wrap
  }
  return { service, depMins, duration, depStr, destEntry, loc };
}

function rankCandidates(candidates) {
  // Sort by arrival time then departure time
  candidates.sort((a,b) => {
    const aArr = parseTime((a.destEntry.workingTime || a.destEntry.publicTime || a.loc.gbttBookedArrival || a.loc.realtimeArrival)?.toString?.());
    const bArr = parseTime((b.destEntry.workingTime || b.destEntry.publicTime || b.loc.gbttBookedArrival || b.loc.realtimeArrival)?.toString?.());
    if (aArr !== bArr) return aArr - bArr;
    return a.depMins - b.depMins;
  });
  return candidates;
}

function logCandidate(candidate, selected = false) {
  try {
    const { depStr, destEntry, loc } = candidate;
    const destArrival = destEntry.publicTime || destEntry.workingTime || loc.realtimeArrival || loc.gbttBookedArrival || 'N/A';
    const originDesc = loc.origin?.[0]?.description || loc.origin?.[0]?.tiploc || 'unknown';
    const destDesc = destEntry.description || destEntry.tiploc || 'unknown';
    const platform = loc.platform || '?';
    const prefix = selected ? 'SELECTED' : 'candidate';
    log.debug(`[RTTBridge] ${prefix}: dep=${depStr} arr=${destArrival} ${originDesc}→${destDesc} platform=${platform}`);
  } catch { /* ignore */ }
}

export function pickNextService(services, destTiploc, opts = {}) {
  if (!Array.isArray(services)) return undefined;

  const minAfterMinutes = Number(opts.minAfterMinutes ?? 20);
  const windowMinutes = Number(opts.windowMinutes ?? 60);
  const now = opts.now ? new Date(opts.now) : new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const earliest = nowMinutes + minAfterMinutes;
  const latest = earliest + windowMinutes;

  const candidates = services.map(s => {
    const loc = s.locationDetail || {};
    const depStr = loc.gbttBookedDeparture || loc.realtimeDeparture;
    let depMins = parseTime(depStr);
    if (Number.isNaN(depMins)) return null;
    depMins = normalizeDepartureMinutes(depMins, nowMinutes);
    if (!withinWindow(depMins, earliest, latest)) return null;
    const destEntry = findDestinationEntry(loc, destTiploc);
    if (!destEntry) {
      const id = s.serviceUid || s.trainIdentity || s.runningIdentity || 'unknown';
      log.warn(`[RTTBridge] excluding service ${id}: no destination TIPLOC ${destTiploc}`);
      return null;
    }
    const cand = buildCandidate(s, destEntry, loc, depMins, depStr);
    logCandidate(cand, false);
    return cand;
  }).filter(Boolean);

  if (candidates.length === 0) {
    log.info(`[RTTBridge] info: no candidate service found (origin=${config.train.originTiploc} dest=${destTiploc} minAfter=${minAfterMinutes} window=${windowMinutes})`);
    return undefined;
  }

  const ranked = rankCandidates(candidates);
  const selected = ranked[0];
  logCandidate(selected, true);
  return selected.service;
}

export default pickNextService;
