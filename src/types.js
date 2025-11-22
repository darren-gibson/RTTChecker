/**
 * @file Type definitions for RTT train data and internal structures.
 * This file provides JSDoc type annotations for use across the codebase.
 * While JavaScript doesn't enforce these at runtime, they provide:
 * - Better IDE autocomplete and IntelliSense
 * - Documentation for API contracts
 * - Type checking if using TypeScript or JSDoc validation
 */

/**
 * @typedef {Object} RTTLocation
 * @property {string} [tiploc] - Timing Point Location code
 * @property {string} [description] - Location description/name
 * @property {string} [workingTime] - Working timetable time (HHmm format)
 * @property {string} [publicTime] - Public timetable time (HHmm format)
 * @property {string} [gbttBookedDeparture] - Booked departure time
 * @property {string} [gbttBookedArrival] - Booked arrival time
 * @property {string} [realtimeArrival] - Real-time arrival (HHmm format)
 * @property {string} [realtimeDeparture] - Real-time departure (HHmm format)
 * @property {RTTLocation[]} [origin] - Origin location details
 * @property {RTTLocation[]} [destination] - Destination location details
 */

/**
 * @typedef {Object} RTTService
 * @property {string} serviceUid - Unique service identifier
 * @property {string} [runDate] - Service run date (YYYY-MM-DD)
 * @property {string} [trainIdentity] - Train number/identity
 * @property {string} [atocCode] - Train Operating Company code
 * @property {string} [atocName] - Train Operating Company name
 * @property {string} [serviceType] - Service type (passenger, freight, etc.)
 * @property {boolean} [isPassenger] - Whether service carries passengers
 * @property {RTTLocation[]} [locationDetail] - Array of location details
 * @property {RTTLocation} [locationDetail.0] - First location (typically origin)
 */

/**
 * @typedef {Object} RTTSearchResponse
 * @property {string} [location] - Location name/description
 * @property {string} [filter] - Applied search filter
 * @property {RTTService[]} [services] - Array of matching train services
 */

/**
 * @typedef {Object} TrainStatusResult
 * @property {string} status - Train status (on_time, minor_delay, delayed, major_delay, cancelled, unknown)
 * @property {RTTService|null} selected - Selected service, or null if none found
 * @property {RTTSearchResponse} raw - Raw RTT API response
 */

/**
 * @typedef {Object} StatusChangeEvent
 * @property {number} timestamp - Event timestamp (ms since epoch)
 * @property {number} previousMode - Previous Matter mode value (0-4)
 * @property {number} currentMode - Current Matter mode value (0-4)
 * @property {boolean} modeChanged - Whether mode actually changed
 * @property {string} trainStatus - Train status string (on_time, minor_delay, etc.)
 * @property {RTTService|null} selectedService - Selected train service, or null
 * @property {RTTSearchResponse|null} raw - Raw RTT response, or null on error
 * @property {Error|null} error - Error object if update failed, otherwise null
 */

/**
 * @typedef {Object} TrainSelectionOptions
 * @property {number} [minAfterMinutes=20] - Minimum minutes after current time
 * @property {number} [windowMinutes=60] - Search window size in minutes
 * @property {Date} [now] - Current time (defaults to new Date())
 */

/**
 * @typedef {Object} TrainCandidate
 * @property {RTTService} service - The train service
 * @property {number} depMins - Departure time in minutes since midnight
 * @property {number} duration - Journey duration in minutes
 * @property {string} depStr - Departure time string (for logging)
 * @property {RTTLocation} destEntry - Destination location entry
 * @property {RTTLocation} loc - Origin location details
 */

// This file exports no runtime values, only type definitions for JSDoc
export {};
