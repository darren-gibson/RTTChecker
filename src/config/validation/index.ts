/**
 * Configuration validation module
 * @module config/validation
 */

import { z } from 'zod';

import { applyRefinements } from './refinements.js';
import { envSchema } from './envSchema.js';
import { formatValidationError } from './errorFormatter.js';
import { loadEnvVars } from './envLoader.js';

// Create validated schema with refinements
const validatedEnvSchema = applyRefinements(envSchema);

/**
 * Validate required configuration
 * @throws ConfigurationError If critical config is missing or invalid
 */
export function validateConfig(): void {
  try {
    // Load environment variables
    const envToValidate = loadEnvVars();

    // Validate with Zod schema
    validatedEnvSchema.parse(envToValidate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw formatValidationError(error);
    }

    // Re-throw non-Zod errors
    throw error;
  }
}

// Re-export types and utilities for convenience
export type { EnvSchema } from './envSchema.js';
export { envSchema } from './envSchema.js';
export { loadEnvVars } from './envLoader.js';
export { formatValidationError } from './errorFormatter.js';
