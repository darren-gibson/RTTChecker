import { adjustForDayRollover, hhmmToMins, isWithinTimeWindow } from '../utils/timeUtils.js';

/**
 * Time window for filtering train departures.
 */
export interface TimeWindow {
  earliest: number;
  latest: number;
  nowMinutes: number;
}

/**
 * Calculates journey duration between origin and destination.
 *
 * Handles time wraparound for journeys crossing midnight.
 */
export class JourneyTimeCalculator {
  /**
   * Calculate journey duration in minutes from origin to destination times.
   *
   * @param originTime - Time at origin (HHMM format or number)
   * @param destinationTime - Time at destination (HHMM format or number)
   * @returns Duration in minutes, or NaN if times are invalid
   */
  static calculateDuration(
    originTime: string | number | undefined,
    destinationTime: string | number | undefined
  ): number {
    const originMins = hhmmToMins(originTime?.toString?.());
    const destMins = hhmmToMins(destinationTime?.toString?.());

    if (Number.isNaN(originMins) || Number.isNaN(destMins)) {
      return NaN;
    }

    let duration = destMins - originMins;
    // Handle midnight rollover (e.g., 23:45 to 00:15 = 30 minutes)
    if (duration < 0) {
      duration += 24 * 60;
    }

    return duration;
  }
}

/**
 * Filters train departures based on time windows.
 *
 * Handles day rollover and validates departure times are within acceptable range.
 */
export class DepartureTimeFilter {
  /**
   * Create a time window from current time and constraints.
   *
   * @param now - Current date/time
   * @param minAfterMinutes - Minimum minutes from now before considering trains
   * @param windowMinutes - Size of search window in minutes
   * @returns Time window with earliest and latest departure times
   */
  static createTimeWindow(now: Date, minAfterMinutes: number, windowMinutes: number): TimeWindow {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const earliest = nowMinutes + minAfterMinutes;
    const latest = earliest + windowMinutes;

    return {
      earliest,
      latest,
      nowMinutes,
    };
  }

  /**
   * Check if a departure time is within the acceptable time window.
   *
   * Adjusts for day rollover before comparison.
   *
   * @param departureStr - Departure time string (HHMM format)
   * @param window - Time window to check against
   * @returns True if departure is within window, false otherwise
   */
  static isWithinWindow(departureStr: string | number | undefined, window: TimeWindow): boolean {
    let depMins = hhmmToMins(departureStr);

    if (Number.isNaN(depMins)) {
      return false;
    }

    // Adjust for potential day rollover
    depMins = adjustForDayRollover(depMins, window.nowMinutes);

    return isWithinTimeWindow(depMins, window.earliest, window.latest);
  }
}
