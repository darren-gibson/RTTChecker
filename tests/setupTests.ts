// Configure logger for test environment
// Pino logger is automatically set to 'silent' level when NODE_ENV=test

import * as realLogger from '../src/utils/logger.js';

// Ensure logger is in test mode (silent)
try {
  if (typeof realLogger.setLogLevel === 'function') {
    realLogger.setLogLevel('silent');
  }
} catch {
  // Ignore if logger configuration fails
}
