/**
 * Configuration sanitization utilities
 * @module config/sanitization
 */

/**
 * Sanitize device name for Matter compatibility
 * Matter device names should be simple ASCII strings
 * @param name - Device name to sanitize
 * @returns Sanitized device name (max 64 chars, printable ASCII only)
 */
export function sanitizeDeviceName(name: string): string {
  // Replace arrow with simple dash, limit to alphanumeric + spaces + basic punctuation
  return name
    .replace(/→/g, '-')
    .replace(/[^\x20-\x7E]/g, '') // Keep only printable ASCII
    .trim()
    .substring(0, 64); // Matter has name length limits
}
