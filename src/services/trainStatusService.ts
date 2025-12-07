import { TrainStatus, type TrainStatusType } from '../constants.js';
import { rttSearch, type RTTService, type RTTSearchResponse } from '../api/rttApiClient.js';
import { calculateOnTimeStatus } from '../domain/trainStatus.js';
import { formatDateYMD } from '../utils/timeUtils.js';

import { pickNextService } from './trainSelectionService.js';

export interface TrainStatusOptions {
  originTiploc: string | null;
  destTiploc: string | null;
  minAfterMinutes?: number;
  windowMinutes?: number;
  now?: Date;
  fetchImpl?: typeof fetch;
}

export interface TrainStatusResult {
  status: TrainStatusType;
  selected: RTTService | null;
  raw: RTTSearchResponse | null;
}

/**
 * Core business logic for getting train status from RTT API.
 * Searches for trains from origin to destination, selects the next appropriate service,
 * and calculates on-time status based on delays.
 */
export async function getTrainStatus({
  originTiploc,
  destTiploc,
  minAfterMinutes = 20,
  windowMinutes = 60,
  now,
  fetchImpl,
}: TrainStatusOptions): Promise<TrainStatusResult> {
  // Check for null tiploc values
  if (!originTiploc || !destTiploc) {
    return { status: TrainStatus.UNKNOWN, selected: null, raw: null };
  }

  // Default to current time if not provided
  const currentTime = now || new Date();
  const dateStr = formatDateYMD(currentTime);

  const data = await rttSearch(originTiploc, destTiploc, dateStr, { fetchImpl });
  const svc = pickNextService(data?.services || [], destTiploc, {
    minAfterMinutes,
    windowMinutes,
    now: currentTime,
  });
  if (!svc) {
    return { status: TrainStatus.UNKNOWN, selected: null, raw: data };
  }

  const status = calculateOnTimeStatus(svc);
  return { status, selected: svc, raw: data };
}

// Export for convenience
export { calculateOnTimeStatus };
