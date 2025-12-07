/**
 * Application configuration
 * Loads and validates environment variables with sensible defaults
 */

import { z } from 'zod';

import { ConfigurationError } from './errors.js';

export const config = {
  // RTT API credentials
  rtt: {
    user: process.env.RTT_USER,
    pass: process.env.RTT_PASS,
  },

  // Train search defaults
  train: {
    originTiploc: process.env.ORIGIN_TIPLOC || 'CAMBDGE',
    destTiploc: process.env.DEST_TIPLOC || 'KNGX',
    minAfterMinutes: Number(process.env.MIN_AFTER_MINUTES || 20),
    windowMinutes: Number(process.env.WINDOW_MINUTES || 60),
  },

  // Server configuration (for testing/debugging)
  server: {
    port: Number(process.env.PORT || 8080),
    nodeEnv: process.env.NODE_ENV,
  },

  // Matter device configuration
  matter: {
    deviceName: process.env.DEVICE_NAME || 'Train Status',
    vendorName: process.env.VENDOR_NAME || 'RTT Checker',
    productName: process.env.PRODUCT_NAME || 'Train Status Monitor',
    serialNumber: process.env.SERIAL_NUMBER || 'RTT-001',
    discriminator: Number(process.env.DISCRIMINATOR || 3840),
    passcode: Number(process.env.PASSCODE || 20202021),
    // Use a Bridge (Aggregator) to group endpoints under a single device.
    // Set USE_BRIDGE=false to expose endpoints directly without a bridge in controllers like Google Home.
    useBridge: (process.env.USE_BRIDGE ?? 'true').toLowerCase() !== 'false',
  },
};

/**
 * Sanitize device name for Matter compatibility
 * Matter device names should be simple ASCII strings
 */
function sanitizeDeviceName(name) {
  // Replace arrow with simple dash, limit to alphanumeric + spaces + basic punctuation
  return name
    .replace(/→/g, '-')
    .replace(/[^\x20-\x7E]/g, '') // Keep only printable ASCII
    .trim()
    .substring(0, 64); // Matter has name length limits
}

// Derive per-endpoint names (can be overridden by explicit env vars)
const defaultStatusName = `${config.train.originTiploc}-${config.train.destTiploc} Train Status`;
const defaultDelayName = `${config.train.originTiploc}-${config.train.destTiploc} Train Delay`;
const defaultAirQualityName = `${config.train.originTiploc}-${config.train.destTiploc} Air Quality`;

config.matter.statusDeviceName = sanitizeDeviceName(
  process.env.STATUS_DEVICE_NAME || defaultStatusName
);
config.matter.delayDeviceName = sanitizeDeviceName(
  process.env.DELAY_DEVICE_NAME || defaultDelayName
);
config.matter.airQualityDeviceName = sanitizeDeviceName(
  process.env.AIR_QUALITY_DEVICE_NAME || defaultAirQualityName
);

/**
 * Check if running in test environment
 */
export const isTestEnv = () => config.server.nodeEnv === 'test';

/**
 * Check if running in production environment
 */
export const isProductionEnv = () => config.server.nodeEnv === 'production';

/**
 * Zod schema for environment variable validation
 */
const envSchema = z.object({
  // Required RTT API credentials
  RTT_USER: z.string().min(1, 'RTT_USER must not be empty'),
  RTT_PASS: z.string().min(1, 'RTT_PASS must not be empty'),

  // Optional train search configuration
  ORIGIN_TIPLOC: z
    .string()
    .regex(/^[A-Z0-9]{3,8}$/, 'ORIGIN_TIPLOC must be 3-8 uppercase alphanumeric characters')
    .optional(),
  DEST_TIPLOC: z
    .string()
    .regex(/^[A-Z0-9]{3,8}$/, 'DEST_TIPLOC must be 3-8 uppercase alphanumeric characters')
    .optional(),
  MIN_AFTER_MINUTES: z.coerce.number().int().min(0).max(1440).optional(),
  WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).optional(),

  // Optional server configuration
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),

  // Optional Matter device configuration
  DEVICE_NAME: z.string().max(64).optional(),
  VENDOR_NAME: z.string().max(64).optional(),
  PRODUCT_NAME: z.string().max(64).optional(),
  SERIAL_NUMBER: z.string().max(32).optional(),
  DISCRIMINATOR: z.coerce.number().int().min(0).max(4095).optional(),
  PASSCODE: z.coerce.number().int().min(1).max(99999999).optional(),
  USE_BRIDGE: z.enum(['true', 'false']).optional(),
  STATUS_DEVICE_NAME: z.string().max(64).optional(),
  DELAY_DEVICE_NAME: z.string().max(64).optional(),

  // Optional logging configuration
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).optional(),
  MATTER_LOG_FORMAT: z.enum(['ansi', 'plain', 'html']).optional(),
  EXIT_AFTER_MS: z.coerce.number().int().min(0).optional(),
});

/**
 * Validate required configuration
 * Throws ConfigurationError if critical config is missing or invalid
 */
export function validateConfig() {
  try {
    // Validate only the fields that are actually set or required
    const envToValidate = {};

    // Always validate required fields
    envToValidate.RTT_USER = process.env.RTT_USER;
    envToValidate.RTT_PASS = process.env.RTT_PASS;

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
      'LOG_LEVEL',
      'MATTER_LOG_FORMAT',
      'EXIT_AFTER_MS',
    ];

    for (const field of optionalFields) {
      if (process.env[field] !== undefined) {
        envToValidate[field] = process.env[field];
      }
    }

    // Validate with Zod schema
    envSchema.parse(envToValidate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        const path = issue.path.join('.');
        return `   • ${path}: ${issue.message}`;
      });

      const msg = [
        '❌ Configuration validation failed:',
        ...issues,
        '',
        'Please fix the configuration errors and restart.',
        'See README.md for configuration details.',
      ].join('\n');

      throw new ConfigurationError(msg, {
        validationErrors: error.issues,
        context: {
          rttUser: config.rtt.user ? '(set)' : '(not set)',
          rttPass: config.rtt.pass ? '(set)' : '(not set)',
        },
      });
    }

    // Re-throw non-Zod errors
    throw error;
  }
}
