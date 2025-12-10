/**
 * Configuration validation using Zod schema
 * @module config/validation
 */

import { z } from 'zod';

import { ConfigurationError } from '../errors.js';
import {
  isTiploc,
  isValidPort,
  isValidDiscriminator,
  isValidPasscode,
  isValidDeviceName,
  isValidLogLevel,
  isValidMatterLogFormat,
  sanitizeTiploc,
} from '../utils/validation.js';

import { config } from './configDefaults.js';

// Helper to safely access process.env with proper typing
const env = process.env as Record<string, string | undefined>;

/**
 * Zod schema for environment variable validation with custom refinements
 */
const envSchema = z
  .object({
    // Required RTT API credentials
    RTT_USER: z.string().min(1, 'RTT_USER must not be empty'),
    RTT_PASS: z.string().min(1, 'RTT_PASS must not be empty'),

    // Optional train search configuration
    ORIGIN_TIPLOC: z.string().optional(),
    DEST_TIPLOC: z.string().optional(),
    MIN_AFTER_MINUTES: z.coerce.number().int().min(0).max(1440).optional(),
    WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).optional(),

    // Optional server configuration
    PORT: z.coerce.number().int().optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).optional(),

    // Optional Matter device configuration
    DEVICE_NAME: z.string().optional(),
    VENDOR_NAME: z.string().max(64).optional(),
    PRODUCT_NAME: z.string().max(64).optional(),
    SERIAL_NUMBER: z.string().max(32).optional(),
    DISCRIMINATOR: z.coerce.number().int().optional(),
    PASSCODE: z.coerce.number().int().optional(),
    USE_BRIDGE: z.enum(['true', 'false']).optional(),
    STATUS_DEVICE_NAME: z.string().optional(),
    DELAY_DEVICE_NAME: z.string().optional(),
    AIR_QUALITY_DEVICE_NAME: z.string().optional(),
    PRIMARY_ENDPOINT: z.enum(['mode', 'airQuality']).optional(),

    // Optional logging configuration
    LOG_LEVEL: z.string().optional(),
    MATTER_LOG_FORMAT: z.string().optional(),
    EXIT_AFTER_MS: z.coerce.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    // Validate TIPLOCs with custom validator
    if (data.ORIGIN_TIPLOC !== undefined) {
      const sanitized = sanitizeTiploc(data.ORIGIN_TIPLOC);
      if (!isTiploc(sanitized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ORIGIN_TIPLOC'],
          message: 'Must be a valid TIPLOC (1-7 uppercase alphanumeric characters)',
        });
      }
    }

    if (data.DEST_TIPLOC !== undefined) {
      const sanitized = sanitizeTiploc(data.DEST_TIPLOC);
      if (!isTiploc(sanitized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DEST_TIPLOC'],
          message: 'Must be a valid TIPLOC (1-7 uppercase alphanumeric characters)',
        });
      }
    }

    // Validate port with custom validator
    if (data.PORT !== undefined && !isValidPort(data.PORT)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PORT'],
        message: 'Must be a valid port number (1-65535)',
      });
    }

    // Validate discriminator with custom validator
    if (data.DISCRIMINATOR !== undefined && !isValidDiscriminator(data.DISCRIMINATOR)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DISCRIMINATOR'],
        message: 'Must be a valid Matter discriminator (0-4095)',
      });
    }

    // Validate passcode with custom validator
    if (data.PASSCODE !== undefined && !isValidPasscode(data.PASSCODE)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PASSCODE'],
        message:
          'Must be a valid Matter passcode (20000000-99999999, excluding reserved test codes)',
      });
    }

    // Validate device names with custom validator
    const deviceNameFields = [
      'DEVICE_NAME',
      'STATUS_DEVICE_NAME',
      'DELAY_DEVICE_NAME',
      'AIR_QUALITY_DEVICE_NAME',
    ] as const;
    for (const field of deviceNameFields) {
      const value = data[field];
      if (value !== undefined && !isValidDeviceName(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: 'Must be 1-32 printable ASCII characters without leading/trailing spaces',
        });
      }
    }

    // Validate log level with custom validator
    if (data.LOG_LEVEL !== undefined && !isValidLogLevel(data.LOG_LEVEL)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['LOG_LEVEL'],
        message: 'Must be a valid Pino log level (trace, debug, info, warn, error, fatal, silent)',
      });
    }

    // Validate Matter log format with custom validator
    if (data.MATTER_LOG_FORMAT !== undefined && !isValidMatterLogFormat(data.MATTER_LOG_FORMAT)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MATTER_LOG_FORMAT'],
        message: 'Must be a valid Matter log format (ansi, plain, html)',
      });
    }
  });

/**
 * Validate required configuration
 * @throws ConfigurationError If critical config is missing or invalid
 */
export function validateConfig(): void {
  try {
    // Validate only the fields that are actually set or required
    const envToValidate: Record<string, string | number | undefined> = {};

    // Always validate required fields
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
      'LOG_LEVEL',
      'MATTER_LOG_FORMAT',
      'EXIT_AFTER_MS',
    ] as const;

    for (const field of optionalFields) {
      if (env[field] !== undefined) {
        envToValidate[field] = env[field];
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
        context: {
          rttUser: config.rtt.user ? '(set)' : '(not set)',
          rttPass: config.rtt.pass ? '(set)' : '(not set)',
          validationErrors: error.issues,
        },
      });
    }

    // Re-throw non-Zod errors
    throw error;
  }
}
