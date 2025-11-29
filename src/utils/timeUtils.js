/**
 * Time parsing and normalization utilities for train schedule calculations.
 * @module timeUtils
 */

/**
 * Convert HHmm time string to minutes since midnight.
 * @param {string|number} ts - Time string in HHmm format (e.g., "0830" for 08:30)
 * @returns {number} Minutes since midnight, or NaN if invalid
 * @example
 * hhmmToMins("0830") // 510 (8*60 + 30)
 * hhmmToMins("1200") // 720 (12*60)
 * hhmmToMins("2359") // 1439
 * hhmmToMins("") // NaN
 */
export function hhmmToMins(ts) {
  if (!ts) return NaN;
  const s = String(ts);
  if (s.length < 4) return NaN;
  return parseInt(s.slice(0, 2), 10) * 60 + parseInt(s.slice(2, 4), 10);
}

/**
 * Normalize departure minutes to handle day wraparound.
 * If departure time is earlier than current time, assumes next day.
 * @param {number} depMins - Departure time in minutes since midnight
 * @param {number} nowMinutes - Current time in minutes since midnight
 * @returns {number} Normalized minutes (may exceed 1440 for next-day departures)
 * @example
 * normalizeDepartureMinutes(120, 1400) // 1560 (120 + 1440, next day)
 * normalizeDepartureMinutes(1400, 500) // 1400 (same day)
 */
export function normalizeDepartureMinutes(depMins, nowMinutes) {
  if (Number.isNaN(depMins)) return depMins;
  // Day wrap: if departure earlier than now, treat as next day
  if (depMins < nowMinutes) return depMins + 24 * 60;
  return depMins;
}

/**
 * Check if a time value falls within a time window.
 * @param {number} minutes - Time in minutes since midnight to check
 * @param {number} earliest - Window start in minutes
 * @param {number} latest - Window end in minutes
 * @returns {boolean} True if within window (inclusive)
 * @example
 * isWithinTimeWindow(500, 480, 600) // true (08:20 within 08:00-10:00)
 * isWithinTimeWindow(700, 480, 600) // false (11:40 outside 08:00-10:00)
 */
export function isWithinTimeWindow(minutes, earliest, latest) {
  return minutes >= earliest && minutes <= latest;
}
