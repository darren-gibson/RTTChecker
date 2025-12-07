/**
 * Input validation utilities
 * Provides reusable validation functions for common patterns
 */

/**
 * Check if a string is a valid TIPLOC code
 * TIPLOCs are 3-8 character uppercase alphanumeric codes
 * @param {string} value - Value to check
 * @returns {boolean} True if valid TIPLOC
 * @example
 * isTiploc('CAMBDGE') // true
 * isTiploc('kngx') // false (must be uppercase)
 * isTiploc('AB') // false (too short)
 */
export function isTiploc(value) {
  if (typeof value !== 'string') return false;
  return /^[A-Z0-9]{3,8}$/.test(value);
}

/**
 * Check if a value is within a numeric range (inclusive)
 * @param {number} value - Value to check
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean} True if within range
 * @example
 * isWithinRange(50, 0, 100) // true
 * isWithinRange(150, 0, 100) // false
 */
export function isWithinRange(value, min, max) {
  if (typeof value !== 'number' || Number.isNaN(value)) return false;
  return value >= min && value <= max;
}

/**
 * Check if a value is a valid port number (1-65535)
 * @param {number} value - Port number to check
 * @returns {boolean} True if valid port
 * @example
 * isValidPort(8080) // true
 * isValidPort(70000) // false
 */
export function isValidPort(value) {
  return isWithinRange(value, 1, 65535);
}

/**
 * Check if a value is a valid Matter discriminator (0-4095)
 * @param {number} value - Discriminator to check
 * @returns {boolean} True if valid discriminator
 * @example
 * isValidDiscriminator(3840) // true
 * isValidDiscriminator(5000) // false
 */
export function isValidDiscriminator(value) {
  return isWithinRange(value, 0, 4095);
}

/**
 * Check if a value is a valid Matter passcode (1-99999999)
 * @param {number} value - Passcode to check
 * @returns {boolean} True if valid passcode
 * @example
 * isValidPasscode(20202021) // true
 * isValidPasscode(0) // false
 */
export function isValidPasscode(value) {
  return isWithinRange(value, 1, 99999999);
}

/**
 * Validate a device name for Matter compatibility
 * Matter device names should be 1-64 characters, printable ASCII
 * @param {string} value - Device name to validate
 * @returns {boolean} True if valid device name
 * @example
 * isValidDeviceName('Train Status') // true
 * isValidDeviceName('') // false (empty)
 * isValidDeviceName('a'.repeat(65)) // false (too long)
 */
export function isValidDeviceName(value) {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > 64) return false;
  // Check for printable ASCII characters only (space to tilde)
  return /^[\x20-\x7E]+$/.test(value);
}

/**
 * Validate a log level string
 * @param {string} value - Log level to validate
 * @returns {boolean} True if valid log level
 * @example
 * isValidLogLevel('info') // true
 * isValidLogLevel('verbose') // false
 */
export function isValidLogLevel(value) {
  const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];
  return validLevels.includes(value);
}

/**
 * Validate a Matter log format string
 * @param {string} value - Log format to validate
 * @returns {boolean} True if valid log format
 * @example
 * isValidMatterLogFormat('ansi') // true
 * isValidMatterLogFormat('json') // false
 */
export function isValidMatterLogFormat(value) {
  const validFormats = ['ansi', 'plain', 'html'];
  return validFormats.includes(value);
}

/**
 * Sanitize a TIPLOC code (uppercase, trim, validate)
 * @param {string} value - TIPLOC to sanitize
 * @returns {string|null} Sanitized TIPLOC or null if invalid
 * @example
 * sanitizeTiploc('cambdge') // 'CAMBDGE'
 * sanitizeTiploc('  KNGX  ') // 'KNGX'
 * sanitizeTiploc('invalid!') // null
 */
export function sanitizeTiploc(value) {
  if (typeof value !== 'string') return null;
  const sanitized = value.trim().toUpperCase();
  return isTiploc(sanitized) ? sanitized : null;
}

/**
 * Validate and clamp a numeric value to a range
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} defaultValue - Default if invalid
 * @returns {number} Clamped value
 * @example
 * clampValue(150, 0, 100, 50) // 100
 * clampValue(-10, 0, 100, 50) // 0
 * clampValue(NaN, 0, 100, 50) // 50
 */
export function clampValue(value, min, max, defaultValue) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return defaultValue;
  }
  return Math.min(Math.max(value, min), max);
}
