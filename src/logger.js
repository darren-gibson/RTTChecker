// Centralized logger using matter.js Logger for consistent logging across the project
// Wraps matter.js Logger to maintain existing API while leveraging matter.js logging infrastructure

import { Logger, Level } from '@project-chip/matter.js/log';
// Attempt to also configure the logger from '@matter/general' if present to ensure
// a single environment-driven log level is respected across both packages.
let GeneralLogger; // will remain undefined if module not installed / different version.
try {
  // Some versions expose the same Logger through '@matter/general'
  // We don't hard-fail if unavailable.
  // eslint-disable-next-line import/no-extraneous-dependencies,global-require
  GeneralLogger = require('@matter/general').Logger; // CommonJS require for optional import
} catch (_) {
  GeneralLogger = undefined;
}

// Configure matter.js logger based on LOG_LEVEL environment variable
const levelMap = {
  'debug': Level.DEBUG,
  'info': Level.INFO,
  'warn': Level.WARN,
  'error': Level.ERROR,
};

// Set default log level for all facilities
const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const resolvedLevel = levelMap[envLevel] ?? Level.INFO;
// Prevent future code from lowering the default log level below our resolved level.
function guardDefaultSetter(activeLogger) {
  if (!activeLogger || activeLogger.__guardedDefaultSetter) return;
  const original = activeLogger.setDefaultLoglevelForLogger?.bind(activeLogger);
  if (original) {
    activeLogger.setDefaultLoglevelForLogger = (identifier, level) => {
      if (level < resolvedLevel) {
        level = resolvedLevel; // enforce floor
      }
      return original(identifier, level);
    };
  }
  activeLogger.__guardedDefaultSetter = true;
}
guardDefaultSetter(Logger);
if (GeneralLogger) guardDefaultSetter(GeneralLogger);

// Also guard per-facility assignments to avoid lowering below global.
function guardFacilitySetter(activeLogger) {
  if (!activeLogger || activeLogger.__guardedFacilitySetter) return;
  const original = activeLogger.setLogLevelsForLogger?.bind(activeLogger);
  if (original) {
    activeLogger.setLogLevelsForLogger = (identifier, levels) => {
      const adjusted = {};
      for (const [k, v] of Object.entries(levels)) {
        adjusted[k] = v < resolvedLevel ? resolvedLevel : v;
      }
      return original(identifier, adjusted);
    };
  }
  activeLogger.__guardedFacilitySetter = true;
}
guardFacilitySetter(Logger);
if (GeneralLogger) guardFacilitySetter(GeneralLogger);

// Set (or re-set) defaults after guards installed.
Logger.defaultLogLevel = resolvedLevel;
if (GeneralLogger) GeneralLogger.defaultLogLevel = resolvedLevel;

// Set ANSI format for consistent, readable output with level and facility names.
// Override with MATTER_LOG_FORMAT env var if needed (plain, ansi, html).
const chosenFormat = process.env.MATTER_LOG_FORMAT || 'ansi';
Logger.format = chosenFormat;
if (GeneralLogger) {
  GeneralLogger.format = chosenFormat;
}

// Propagate the unified default level to all already-known facilities so that
// any facility created earlier at a lower level (e.g. DEBUG) is raised.
function normalizeFacilityLevels(activeLogger) {
  if (!activeLogger || !activeLogger.logLevels) return;
  const keys = Object.keys(activeLogger.logLevels);
  for (const k of keys) {
    if (activeLogger.logLevels[k] < resolvedLevel) {
      activeLogger.logLevels[k] = resolvedLevel;
    }
  }
}
normalizeFacilityLevels(Logger);
if (GeneralLogger) normalizeFacilityLevels(GeneralLogger);

// Create facility loggers for different parts of the application
const rttLogger = Logger.get('rtt-checker');
const matterLogger = Logger.get('matter-server');
const bridgeLogger = Logger.get('rtt-bridge');

// Normalize levels again now that we've created our own facilities.
normalizeFacilityLevels(Logger);
if (GeneralLogger) normalizeFacilityLevels(GeneralLogger);

// Monkey-patch Logger.get to ensure any future facility respects the global level.
function patchGet(activeLogger) {
  if (!activeLogger || !activeLogger.get || activeLogger.__globalPatched) return;
  const originalGet = activeLogger.get.bind(activeLogger);
  activeLogger.get = (name) => {
    const l = originalGet(name);
    // After creation, raise level if below global.
    if (activeLogger.logLevels && activeLogger.logLevels[name] < resolvedLevel) {
      activeLogger.logLevels[name] = resolvedLevel;
    }
    return l;
  };
  activeLogger.__globalPatched = true;
}
patchGet(Logger);
if (GeneralLogger) patchGet(GeneralLogger);

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
    if (GeneralLogger) GeneralLogger.defaultLogLevel = matterLevel;
    normalizeFacilityLevels(Logger);
    if (GeneralLogger) normalizeFacilityLevels(GeneralLogger);
    process.env.LOG_LEVEL = level;
  }
}

// Re-export Logger and Level for advanced usage
export { Logger, Level };
