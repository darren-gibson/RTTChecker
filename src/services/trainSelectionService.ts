import { loggers } from '../utils/logger.js';
import { config } from '../config.js';
import { hhmmToMins } from '../utils/timeUtils.js';
import { DepartureTimeFilter, JourneyTimeCalculator } from '../domain/timeCalculations.js';
import type { RTTService } from '../api/rttApiClient.js';

export interface TrainSelectionOptions {
  minAfterMinutes?: number;
  windowMinutes?: number;
  now?: Date;
}

type RTTLocationDetail = NonNullable<RTTService['locationDetail']>;
type RTTDestination = NonNullable<RTTLocationDetail['destination']>[number];

export interface TrainCandidate {
  service: RTTService;
  depMins: number;
  duration: number;
  depStr: string | number | undefined;
  destEntry: RTTDestination;
  loc: RTTLocationDetail;
}

const log = loggers.bridge;

/**
 * Find destination entry in location's destination array.
 */
function findDestinationEntry(
  loc: RTTLocationDetail,
  destTiploc: string
): RTTDestination | undefined {
  const destList = Array.isArray(loc.destination) ? loc.destination : [];
  return destList.find((d) => d.tiploc === destTiploc);
}

/**
 * Build candidate object with computed journey details.
 */
function buildCandidate(
  service: RTTService,
  destEntry: RTTDestination,
  loc: RTTLocationDetail,
  depMins: number,
  depStr: string | number | undefined
): TrainCandidate {
  // Compute journey duration (origin to destination)
  const originTime =
    loc.origin?.[0]?.workingTime || loc.origin?.[0]?.publicTime || loc.gbttBookedDeparture;
  const destTime =
    destEntry.workingTime || destEntry.publicTime || loc.gbttBookedArrival || loc.realtimeArrival;

  const duration = JourneyTimeCalculator.calculateDuration(originTime, destTime);

  return { service, depMins, duration, depStr, destEntry, loc };
}

/**
 * Rank candidates by arrival time (earliest first), then departure time.
 */
function rankCandidates(candidates: TrainCandidate[]): TrainCandidate[] {
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
 */
function logCandidate(candidate: TrainCandidate, selected: boolean = false): void {
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
 * @example
 * const service = pickNextService(data.services, 'KNGX', {
 *   minAfterMinutes: 20,
 *   windowMinutes: 60,
 *   now: new Date()
 * });
 */
export function pickNextService(
  services: RTTService[] | null | undefined,
  destTiploc: string,
  opts: TrainSelectionOptions = {}
): RTTService | undefined {
  if (!Array.isArray(services)) return undefined;

  const minAfterMinutes = Number(opts.minAfterMinutes ?? 20);
  const windowMinutes = Number(opts.windowMinutes ?? 60);
  const now = opts.now ? new Date(opts.now) : new Date();
  const timeWindow = DepartureTimeFilter.createTimeWindow(now, minAfterMinutes, windowMinutes);

  const candidates = services
    .map((s) => {
      const loc = s.locationDetail || {};
      const depStr = loc.gbttBookedDeparture || loc.realtimeDeparture;

      if (!DepartureTimeFilter.isWithinWindow(depStr, timeWindow)) return null;

      const depMins = hhmmToMins(depStr);
      const destEntry = findDestinationEntry(loc, destTiploc);
      if (!destEntry) {
        const id = s.serviceUid || s.trainIdentity || 'unknown';
        log.warn(`excluding service ${id}: no destination TIPLOC ${destTiploc}`);
        return null;
      }
      const cand = buildCandidate(s, destEntry, loc, depMins, depStr);
      logCandidate(cand, false);
      return cand;
    })
    .filter((c): c is TrainCandidate => c !== null);

  if (candidates.length === 0) {
    log.info(
      `no candidate service found (origin=${config.train.originTiploc} dest=${destTiploc} minAfter=${minAfterMinutes} window=${windowMinutes})`
    );
    return undefined;
  }

  const ranked = rankCandidates(candidates);
  const selected = ranked[0];
  if (!selected) return undefined;
  logCandidate(selected, true);
  return selected.service;
}

export default pickNextService;
