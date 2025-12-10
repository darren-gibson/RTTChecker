/**
 * Configuration validation using Zod schema
 * @module config/validation
 * @deprecated Import from './validation/index.js' instead - this file is a compatibility wrapper
 */

// Re-export everything from the modular validation structure
export {
  validateConfig,
  type EnvSchema,
  envSchema,
  loadEnvVars,
  formatValidationError,
} from './validation/index.js';
