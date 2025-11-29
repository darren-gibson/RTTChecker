// Centralized logger using matter.js Logger for consistent logging across the project
// Wraps matter.js Logger to maintain existing API while leveraging matter.js logging infrastructure

import { Logger, Level } from '@project-chip/matter.js/log';

// Set default log level from environment (default to INFO)
const levelMap = { debug: Level.DEBUG, info: Level.INFO, warn: Level.WARN, error: Level.ERROR };
const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const defaultLevel = levelMap[envLevel] ?? Level.INFO;

// Apply log level BEFORE creating any loggers
Logger.defaultLogLevel = defaultLevel;
Logger.format = process.env.MATTER_LOG_FORMAT || 'ansi';

// Guard against Logger.defaultLogLevel being lowered after we set it
const originalDefaultSetter = Object.getOwnPropertyDescriptor(Logger, 'defaultLogLevel')?.set;
if (originalDefaultSetter) {
  Object.defineProperty(Logger, 'defaultLogLevel', {
    set(val) {
      // Only allow raising the level, not lowering it below our env-configured floor
      if (val >= defaultLevel) {
        originalDefaultSetter.call(Logger, val);
      }
    },
    get() {
      return Logger.log.level;
    },
    configurable: true,
    enumerable: true,
  });
}

// Monkey-patch Logger.get to enforce minimum level on all newly created facilities
const originalGet = Logger.get.bind(Logger);
Logger.get = function (name) {
  const logger = originalGet(name);
  // Enforce the minimum level for this facility
  if ((Logger.logLevels[name] ?? Level.DEBUG) < defaultLevel) {
    Logger.logLevels[name] = defaultLevel;
  }
  return logger;
};

// Guard against direct manipulation of Logger.logLevels to bypass our floor
function normalizeFacilityLevels() {
  for (const facility in Logger.logLevels) {
    if (Logger.logLevels[facility] < defaultLevel) {
      Logger.logLevels[facility] = defaultLevel;
    }
  }
}

// Periodically enforce level floor during initialization
const enforcementInterval = setInterval(normalizeFacilityLevels, 10);
setTimeout(() => {
  clearInterval(enforcementInterval);
  // Continue with less frequent enforcement
  setInterval(normalizeFacilityLevels, 1000);
}, 2000);

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
