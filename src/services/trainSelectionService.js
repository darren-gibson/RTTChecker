/**
 * @typedef {import('./types.js').RTTService} RTTService
 * @typedef {import('./types.js').RTTLocation} RTTLocation
 * @typedef {import('./types.js').TrainSelectionOptions} TrainSelectionOptions
 * @typedef {import('./types.js').TrainCandidate} TrainCandidate
 */

import { loggers } from '../utils/logger.js';
import { config } from '../config.js';
import { hhmmToMins, adjustForDayRollover, isWithinTimeWindow } from '../utils/timeUtils.js';

const log = loggers.bridge;

/**
 * Find destination entry in location's destination array.
 * @private
 * @param {RTTLocation} loc - Location details with destinations
 * @param {string} destTiploc - Target destination TIPLOC
 * @returns {RTTLocation|undefined} Matching destination or undefined
 */
function findDestinationEntry(loc, destTiploc) {
  const destList = Array.isArray(loc.destination) ? loc.destination : [];
  return destList.find((d) => d.tiploc === destTiploc);
}

/**
 * Build candidate object with computed journey details.
 * @private
 * @param {RTTService} service - Train service
 * @param {RTTLocation} destEntry - Destination location details
 * @param {RTTLocation} loc - Origin location details
 * @param {number} depMins - Departure minutes since midnight
 * @param {string} depStr - Departure time string (for logging)
 * @returns {TrainCandidate} Candidate with duration and timing details
 */
function buildCandidate(service, destEntry, loc, depMins, depStr) {
  // Compute journey duration (origin to destination)
  const originTime =
    loc.origin?.[0]?.workingTime || loc.origin?.[0]?.publicTime || loc.gbttBookedDeparture;
  const destTime =
    destEntry.workingTime || destEntry.publicTime || loc.gbttBookedArrival || loc.realtimeArrival;
  const o = hhmmToMins(originTime?.toString?.());
  const d = hhmmToMins(destTime?.toString?.());
  let duration = NaN;
  if (!Number.isNaN(o) && !Number.isNaN(d)) {
    duration = d - o;
    if (duration < 0) duration += 24 * 60; // wrap
  }
  return { service, depMins, duration, depStr, destEntry, loc };
}

/**
 * Rank candidates by arrival time (earliest first), then departure time.
 * @private
 * @param {TrainCandidate[]} candidates - Array of candidates to rank
 * @returns {TrainCandidate[]} Sorted candidates (modifies in place)
 */
function rankCandidates(candidates) {
  // Sort by arrival time then departure time
  candidates.sort((a, b) => {
    const aArr = hhmmToMins(
      (
        a.destEntry.workingTime ||
        a.destEntry.publicTime ||
        a.loc.gbttBookedArrival ||
        a.loc.realtimeArrival
      )?.toString?.()
    );
    const bArr = hhmmToMins(
      (
        b.destEntry.workingTime ||
        b.destEntry.publicTime ||
        b.loc.gbttBookedArrival ||
        b.loc.realtimeArrival
      )?.toString?.()
    );
    if (aArr !== bArr) return aArr - bArr;
    return a.depMins - b.depMins;
  });
  return candidates;
}

/**
 * Log candidate details at debug level.
 * @private
 * @param {TrainCandidate} candidate - Candidate to log
 * @param {boolean} [selected=false] - Whether this is the selected candidate
 */
function logCandidate(candidate, selected = false) {
  try {
    const { depStr, destEntry, loc } = candidate;
    const destArrival =
      destEntry.publicTime ||
      destEntry.workingTime ||
      loc.realtimeArrival ||
      loc.gbttBookedArrival ||
      'N/A';
    const originDesc = loc.origin?.[0]?.description || loc.origin?.[0]?.tiploc || 'unknown';
    const destDesc = destEntry.description || destEntry.tiploc || 'unknown';
    const platform = loc.platform || '?';
    const prefix = selected ? 'SELECTED' : 'candidate';
    log.debug(
      `${prefix}: dep=${depStr} arr=${destArrival} ${originDesc}→${destDesc} platform=${platform}`
    );
  } catch {
    /* ignore */
  }
}

/**
 * Pick the next appropriate train service from RTT search results.
 *
 * Filters services by:
 * - Departure time within search window
 * - Presence of destination TIPLOC
 *
 * Ranks by earliest arrival time, then earliest departure.
 *
 * @param {RTTService[]} services - Array of train services from RTT API
 * @param {string} destTiploc - Destination TIPLOC code to match
 * @param {TrainSelectionOptions} [opts={}] - Selection options
 * @returns {RTTService|undefined} Selected service, or undefined if none found
 *
 * @example
 * const service = pickNextService(data.services, 'KNGX', {
 *   minAfterMinutes: 20,
 *   windowMinutes: 60,
 *   now: new Date()
 * });
 */
export function pickNextService(services, destTiploc, opts = {}) {
  if (!Array.isArray(services)) return undefined;

  const minAfterMinutes = Number(opts.minAfterMinutes ?? 20);
  const windowMinutes = Number(opts.windowMinutes ?? 60);
  const now = opts.now ? new Date(opts.now) : new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const earliest = nowMinutes + minAfterMinutes;
  const latest = earliest + windowMinutes;

  const candidates = services
    .map((s) => {
      const loc = s.locationDetail || {};
      const depStr = loc.gbttBookedDeparture || loc.realtimeDeparture;
      let depMins = hhmmToMins(depStr);
      if (Number.isNaN(depMins)) return null;
      depMins = adjustForDayRollover(depMins, nowMinutes);
      if (!isWithinTimeWindow(depMins, earliest, latest)) return null;
      const destEntry = findDestinationEntry(loc, destTiploc);
      if (!destEntry) {
        const id = s.serviceUid || s.trainIdentity || s.runningIdentity || 'unknown';
        log.warn(`excluding service ${id}: no destination TIPLOC ${destTiploc}`);
        return null;
      }
      const cand = buildCandidate(s, destEntry, loc, depMins, depStr);
      logCandidate(cand, false);
      return cand;
    })
    .filter(Boolean);

  if (candidates.length === 0) {
    log.info(
      `no candidate service found (origin=${config.train.originTiploc} dest=${destTiploc} minAfter=${minAfterMinutes} window=${windowMinutes})`
    );
    return undefined;
  }

  const ranked = rankCandidates(candidates);
  const selected = ranked[0];
  logCandidate(selected, true);
  return selected.service;
}

export default pickNextService;
