/**
 * Validation error formatting
 * @module config/validation/errorFormatter
 */

import { z } from 'zod';

import { ConfigurationError } from '../../errors.js';
import { config } from '../configDefaults.js';

/**
 * Format Zod validation errors into a user-friendly ConfigurationError
 */
export function formatValidationError(error: z.ZodError): ConfigurationError {
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

  return new ConfigurationError(msg, {
    context: {
      rttUser: config.rtt.user ? '(set)' : '(not set)',
      rttPass: config.rtt.pass ? '(set)' : '(not set)',
      validationErrors: error.issues,
    },
  });
}
