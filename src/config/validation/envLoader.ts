/**
 * Environment variable loader
 * @module config/validation/envLoader
 */

// Helper to safely access process.env with proper typing
const env = process.env as Record<string, string | undefined>;

/**
 * Load environment variables for validation
 * Only includes variables that are actually set (required or optional)
 */
export function loadEnvVars(): Record<string, string | number | undefined> {
  const envToValidate: Record<string, string | number | undefined> = {};

  // Always include required fields
  envToValidate['RTT_USER'] = env['RTT_USER'];
  envToValidate['RTT_PASS'] = env['RTT_PASS'];

  // Add optional fields if they exist
  const optionalFields = [
    'ORIGIN_TIPLOC',
    'DEST_TIPLOC',
    'MIN_AFTER_MINUTES',
    'WINDOW_MINUTES',
    'PORT',
    'NODE_ENV',
    'DEVICE_NAME',
    'VENDOR_NAME',
    'PRODUCT_NAME',
    'SERIAL_NUMBER',
    'DISCRIMINATOR',
    'PASSCODE',
    'USE_BRIDGE',
    'STATUS_DEVICE_NAME',
    'DELAY_DEVICE_NAME',
    'AIR_QUALITY_DEVICE_NAME',
    'PRIMARY_ENDPOINT',
    'LOG_LEVEL',
    'MATTER_LOG_FORMAT',
    'EXIT_AFTER_MS',
  ] as const;

  for (const field of optionalFields) {
    if (env[field] !== undefined) {
      envToValidate[field] = env[field];
    }
  }

  return envToValidate;
}
