/**
 * Delay calculation utilities
 * Pure domain logic for extracting delay information from RTT service data
 * @module domain/delayCalculation
 */

import type { RTTService } from '../api/rttApiClient.js';

/**
 * Calculate delay in minutes from RTT service location detail
 * Uses realtimeGbttDepartureLateness or realtimeWttDepartureLateness
 *
 * @param service - RTT service data
 * @returns Delay in minutes (positive = late, negative = early, 0 = on time) or null if no service data
 */
export function calculateDelayMinutes(service: RTTService | null): number | null {
  if (!service?.locationDetail) {
    return null;
  }

  const lateness =
    service.locationDetail.realtimeGbttDepartureLateness ??
    service.locationDetail.realtimeWttDepartureLateness;

  // Follow same pattern as calculateOnTimeStatus: null/NaN lateness means on-time (0)
  if (lateness == null || isNaN(Number(lateness))) {
    return 0;
  }

  return Number(lateness);
}

/**
 * Check if delay has changed between two values
 * Handles null values (no delay information available)
 *
 * @param previousDelay - Previous delay in minutes or null
 * @param currentDelay - Current delay in minutes or null
 * @returns True if delay has changed
 */
export function hasDelayChanged(
  previousDelay: number | null,
  currentDelay: number | null
): boolean {
  return previousDelay !== currentDelay;
}
