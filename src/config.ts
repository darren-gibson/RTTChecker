/**
 * Application configuration (legacy module - re-exports from config/)
 * @deprecated Import from './config/index.js' instead
 * @module config
 */

// Re-export everything from the new modular structure for backward compatibility
export type {
  RTTConfig,
  TrainConfig,
  ServerConfig,
  MatterConfig,
  Config,
  PrimaryEndpoint,
} from './config/index.js';

export { config, isTestEnv, isProductionEnv, validateConfig } from './config/index.js';
