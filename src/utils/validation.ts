/**
 * Input validation utilities
 * Provides reusable validation functions for common patterns
 */

/**
 * Check if a string is a valid TIPLOC code
 * TIPLOCs are 3-8 character uppercase alphanumeric codes
 * @param value - Value to check
 * @returns True if valid TIPLOC
 * @example
 * isTiploc('CAMBDGE') // true
 * isTiploc('kngx') // false (must be uppercase)
 * isTiploc('AB') // false (too short)
 */
export function isTiploc(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[A-Z0-9]{3,8}$/.test(value);
}

/**
 * Check if a value is within a numeric range (inclusive)
 * @param value - Value to check
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns True if within range
 * @example
 * isWithinRange(50, 0, 100) // true
 * isWithinRange(150, 0, 100) // false
 */
export function isWithinRange(value: unknown, min: number, max: number): value is number {
  if (typeof value !== 'number' || Number.isNaN(value)) return false;
  return value >= min && value <= max;
}

/**
 * Check if a value is a valid port number (1-65535)
 * @param value - Port number to check
 * @returns True if valid port
 * @example
 * isValidPort(8080) // true
 * isValidPort(70000) // false
 */
export function isValidPort(value: unknown): value is number {
  return isWithinRange(value, 1, 65535);
}

/**
 * Check if a value is a valid Matter discriminator (0-4095)
 * @param value - Discriminator to check
 * @returns True if valid discriminator
 * @example
 * isValidDiscriminator(3840) // true
 * isValidDiscriminator(5000) // false
 */
export function isValidDiscriminator(value: unknown): value is number {
  return isWithinRange(value, 0, 4095);
}

/**
 * Check if a value is a valid Matter passcode (1-99999999)
 * @param value - Passcode to check
 * @returns True if valid passcode
 * @example
 * isValidPasscode(20202021) // true
 * isValidPasscode(0) // false
 */
export function isValidPasscode(value: unknown): value is number {
  return isWithinRange(value, 1, 99999999);
}

/**
 * Validate a device name for Matter compatibility
 * Matter device names should be 1-64 characters, printable ASCII
 * @param value - Device name to validate
 * @returns True if valid device name
 * @example
 * isValidDeviceName('Train Status') // true
 * isValidDeviceName('') // false (empty)
 * isValidDeviceName('a'.repeat(65)) // false (too long)
 */
export function isValidDeviceName(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > 64) return false;
  // Check for printable ASCII characters only (space to tilde)
  return /^[\x20-\x7E]+$/.test(value);
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

/**
 * Validate a log level string
 * @param value - Log level to validate
 * @returns True if valid log level
 * @example
 * isValidLogLevel('info') // true
 * isValidLogLevel('verbose') // false
 */
export function isValidLogLevel(value: unknown): value is LogLevel {
  const validLevels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];
  return validLevels.includes(value as LogLevel);
}

export type MatterLogFormat = 'ansi' | 'plain' | 'html';

/**
 * Validate a Matter log format string
 * @param value - Log format to validate
 * @returns True if valid log format
 * @example
 * isValidMatterLogFormat('ansi') // true
 * isValidMatterLogFormat('json') // false
 */
export function isValidMatterLogFormat(value: unknown): value is MatterLogFormat {
  const validFormats: MatterLogFormat[] = ['ansi', 'plain', 'html'];
  return validFormats.includes(value as MatterLogFormat);
}

/**
 * Sanitize a TIPLOC code (uppercase, trim, validate)
 * @param value - TIPLOC to sanitize
 * @returns Sanitized TIPLOC or null if invalid
 * @example
 * sanitizeTiploc('cambdge') // 'CAMBDGE'
 * sanitizeTiploc('  KNGX  ') // 'KNGX'
 * sanitizeTiploc('invalid!') // null
 */
export function sanitizeTiploc(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const sanitized = value.trim().toUpperCase();
  return isTiploc(sanitized) ? sanitized : null;
}

/**
 * Validate and clamp a numeric value to a range
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @param defaultValue - Default if invalid
 * @returns Clamped value
 * @example
 * clampValue(150, 0, 100, 50) // 100
 * clampValue(-10, 0, 100, 50) // 0
 * clampValue(NaN, 0, 100, 50) // 50
 */
export function clampValue(
  value: unknown,
  min: number,
  max: number,
  defaultValue?: number
): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return defaultValue ?? min;
  }
  return Math.min(Math.max(value, min), max);
}
