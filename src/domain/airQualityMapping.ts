/**
 * Air Quality Mapping for Train Status
 * Maps train punctuality status codes to Matter AirQualityEnum values
 *
 * @module domain/airQualityMapping
 * @see {@link https://github.com/project-chip/connectedhomeip/blob/master/src/app/clusters/air-quality-server/air-quality-server.h}
 */

/**
 * Maps train status codes to Matter AirQualityEnum values
 *
 * Status Mapping:
 * - on_time: Good (1) - Train is on time (0-2 min delay) → Green in Google Home
 * - minor_delay: Fair (2) - Minor delay (3-5 min) → Yellow in Google Home
 * - delayed: Moderate (3) - Delayed (6-10 min) → Orange in Google Home
 * - major_delay: Poor (4) - Major delay (11+ min) → Red in Google Home
 * - unknown: VeryPoor (5) - Unknown status → Dark Red in Google Home
 * - critical: VeryPoor (5) - Critical status → Dark Red in Google Home
 *
 * @type {Object.<string, number>}
 */
export const STATUS_TO_AIR_QUALITY = {
  on_time: 1, // Good - Green
  minor_delay: 2, // Fair - Yellow
  delayed: 3, // Moderate - Orange
  major_delay: 4, // Poor - Red
  unknown: 5, // VeryPoor - Dark Red
  critical: 5, // VeryPoor - Dark Red
};

/**
 * Air Quality Enum values from Matter specification
 *
 * These correspond to the AirQualityEnum in the Matter specification.
 * Each value has an associated color in Google Home's display.
 *
 * @enum {number}
 */
export const AirQuality = {
  /** Unknown air quality - Gray */
  Unknown: 0,
  /** Good air quality - Green */
  Good: 1,
  /** Fair air quality - Yellow */
  Fair: 2,
  /** Moderate air quality - Orange */
  Moderate: 3,
  /** Poor air quality - Red */
  Poor: 4,
  /** Very poor air quality - Dark Red */
  VeryPoor: 5,
  /** Extremely poor air quality - Requires FairAirQuality feature */
  ExtremelyPoor: 6,
};

/**
 * Reverse mapping from AirQuality enum values to descriptive names
 *
 * @type {Object.<number, string>}
 */
export const AIR_QUALITY_NAMES = {
  0: 'Unknown',
  1: 'Good',
  2: 'Fair',
  3: 'Moderate',
  4: 'Poor',
  5: 'VeryPoor',
  6: 'ExtremelyPoor',
};

/**
 * Maps AirQuality enum values to display colors in Google Home
 *
 * @type {Object.<number, string>}
 */
export const AIR_QUALITY_COLORS = {
  0: 'gray',
  1: 'green',
  2: 'yellow',
  3: 'orange',
  4: 'red',
  5: 'dark red',
  6: 'dark red',
};
