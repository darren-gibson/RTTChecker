/**
 * Zod schema for environment variable validation
 * @module config/validation/envSchema
 */

import { z } from 'zod';

/**
 * Zod schema for environment variable validation
 * Defines structure and basic constraints for all environment variables
 */
export const envSchema = z.object({
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
});

export type EnvSchema = z.infer<typeof envSchema>;
