/**
 * Custom Zod refinements for environment variable validation
 * @module config/validation/refinements
 */

import { z } from 'zod';

import {
  isValidDeviceName,
  isValidDiscriminator,
  isValidLogLevel,
  isValidMatterLogFormat,
  isValidPasscode,
  isValidPort,
  isTiploc,
  sanitizeTiploc,
} from '../../utils/validation.js';

import type { EnvSchema } from './envSchema.js';

/**
 * Validate TIPLOC fields (origin and destination)
 */
export function validateTiplocs(data: Partial<EnvSchema>, ctx: z.RefinementCtx): void {
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
}

/**
 * Validate port number
 */
export function validatePort(data: Partial<EnvSchema>, ctx: z.RefinementCtx): void {
  if (data.PORT !== undefined && !isValidPort(data.PORT)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['PORT'],
      message: 'Must be a valid port number (1-65535)',
    });
  }
}

/**
 * Validate Matter discriminator
 */
export function validateDiscriminator(data: Partial<EnvSchema>, ctx: z.RefinementCtx): void {
  if (data.DISCRIMINATOR !== undefined && !isValidDiscriminator(data.DISCRIMINATOR)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DISCRIMINATOR'],
      message: 'Must be a valid Matter discriminator (0-4095)',
    });
  }
}

/**
 * Validate Matter passcode
 */
export function validatePasscode(data: Partial<EnvSchema>, ctx: z.RefinementCtx): void {
  if (data.PASSCODE !== undefined && !isValidPasscode(data.PASSCODE)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['PASSCODE'],
      message: 'Must be a valid Matter passcode (20000000-99999999, excluding reserved test codes)',
    });
  }
}

/**
 * Validate device names
 */
export function validateDeviceNames(data: Partial<EnvSchema>, ctx: z.RefinementCtx): void {
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
}

/**
 * Validate log level
 */
export function validateLogLevel(data: Partial<EnvSchema>, ctx: z.RefinementCtx): void {
  if (data.LOG_LEVEL !== undefined && !isValidLogLevel(data.LOG_LEVEL)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['LOG_LEVEL'],
      message: 'Must be a valid Pino log level (trace, debug, info, warn, error, fatal, silent)',
    });
  }
}

/**
 * Validate Matter log format
 */
export function validateMatterLogFormat(data: Partial<EnvSchema>, ctx: z.RefinementCtx): void {
  if (data.MATTER_LOG_FORMAT !== undefined && !isValidMatterLogFormat(data.MATTER_LOG_FORMAT)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MATTER_LOG_FORMAT'],
      message: 'Must be a valid Matter log format (ansi, plain, html)',
    });
  }
}

/**
 * Apply all custom refinements to the schema
 * Returns a schema with all custom validation refinements applied
 */
export function applyRefinements<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): ReturnType<typeof schema.superRefine> {
  return schema.superRefine((data, ctx) => {
    validateTiplocs(data, ctx);
    validatePort(data, ctx);
    validateDiscriminator(data, ctx);
    validatePasscode(data, ctx);
    validateDeviceNames(data, ctx);
    validateLogLevel(data, ctx);
    validateMatterLogFormat(data, ctx);
  });
}
