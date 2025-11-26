// Centralized logger using matter.js Logger for consistent logging across the project
// Wraps matter.js Logger to maintain existing API while leveraging matter.js logging infrastructure

import { Logger, Level } from '@project-chip/matter.js/log';

// Configure matter.js logger based on LOG_LEVEL environment variable
const levelMap = {
  'debug': Level.DEBUG,
  'info': Level.INFO,
  'warn': Level.WARN,
  'error': Level.ERROR,
};

// Set default log level for all facilities
const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
Logger.defaultLogLevel = levelMap[envLevel] || Level.INFO;

// Set ANSI format for consistent, readable output with level and facility names
// Override with MATTER_LOG_FORMAT env var if needed (plain, ansi, html)
Logger.format = process.env.MATTER_LOG_FORMAT || 'ansi';

// Create facility loggers for different parts of the application
const rttLogger = Logger.get('rtt-checker');
const matterLogger = Logger.get('matter-server');
const bridgeLogger = Logger.get('rtt-bridge');

// Export unified log interface that matches existing API
export const log = {
  error: (...args) => rttLogger.error(...args),
  warn: (...args) => rttLogger.warn(...args),
  info: (...args) => rttLogger.info(...args),
  debug: (...args) => rttLogger.debug(...args),
};

// Export facility-specific loggers for more granular control
export const loggers = {
  rtt: rttLogger,
  matter: matterLogger,
  bridge: bridgeLogger,
};

// Set log level dynamically
export function setLogLevel(level) {
  const matterLevel = levelMap[level.toLowerCase()];
  if (matterLevel !== undefined) {
    Logger.defaultLogLevel = matterLevel;
    process.env.LOG_LEVEL = level;
  }
}

// Re-export Logger and Level for advanced usage
export { Logger, Level };
