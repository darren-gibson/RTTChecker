/**
 * Configuration module
 * Exports all configuration types, defaults, and validation functions
 * @module config
 */

// Export types
export type {
  RTTConfig,
  TrainConfig,
  ServerConfig,
  MatterConfig,
  Config,
  PrimaryEndpoint,
} from './configTypes.js';

// Export configuration object and utility functions
export { config, isTestEnv, isProductionEnv } from './configDefaults.js';

// Export validation function
export { validateConfig } from './configValidation.js';

// Export sanitization utilities
export { sanitizeDeviceName } from './configSanitization.js';
