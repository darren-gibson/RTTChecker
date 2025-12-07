// Mode/status mapping utilities
// Keep domain policy separate from runtime wiring

import { Timing } from '../constants.js';

export const STATUS_TO_MODE = {
  on_time: 0,
  minor_delay: 1,
  delayed: 2,
  major_delay: 3,
  unknown: 4,
};

export const MODE_TO_STATUS = {
  0: 'on_time',
  1: 'minor_delay',
  2: 'delayed',
  3: 'major_delay',
  4: 'unknown',
};

// Derive a mode integer from delay minutes (can be negative for early)
export function deriveModeFromDelay(delayMinutes) {
  if (delayMinutes == null || Number.isNaN(Number(delayMinutes))) {
    return STATUS_TO_MODE.unknown;
  }
  const delay = Number(delayMinutes);
  const abs = Math.abs(delay);
  if (abs <= Timing.LATE_THRESHOLDS.ON_TIME) {
    return STATUS_TO_MODE.on_time;
  } else if (abs <= Timing.LATE_THRESHOLDS.MINOR) {
    return STATUS_TO_MODE.minor_delay;
  } else if (abs <= Timing.LATE_THRESHOLDS.DELAYED) {
    return STATUS_TO_MODE.delayed;
  }
  return STATUS_TO_MODE.major_delay;
}
