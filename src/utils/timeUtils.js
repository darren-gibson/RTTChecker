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
 * Adjust a scheduled time so it always represents a future occurrence relative to a reference time.
 * If the scheduled minutes value is earlier than the current minutes (wraparound), treat it as next day.
 * @param {number} scheduledMinutes - Scheduled time in minutes since midnight
 * @param {number} currentMinutes - Reference "now" time in minutes since midnight
 * @returns {number} Future-oriented minutes (may exceed 1440 when rolled to next day)
 * @example
 * adjustForDayRollover(120, 1400) // 1560 (treated as next day)
 * adjustForDayRollover(1400, 500) // 1400 (same day)
 */
export function adjustForDayRollover(scheduledMinutes, currentMinutes) {
  if (Number.isNaN(scheduledMinutes)) return scheduledMinutes;
  if (scheduledMinutes < currentMinutes) return scheduledMinutes + 24 * 60;
  return scheduledMinutes;
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

/**
 * Format a Date object into a YYYY/MM/DD string.
 * @param {Date} date - Date to format
 * @returns {string} Date string in YYYY/MM/DD format (slash separated)
 * @example
 * formatDateYMD(new Date('2025-11-30')) // "2025/11/30"
 * formatDateYMD(new Date('2025-01-05')) // "2025/01/05"
 */
export function formatDateYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

/** @deprecated Use formatDateYMD instead */
// One-time deprecation warning tracker