// Independent centralized logger using Pino
// Provides bridge to configure matter.js Logger to use our logging system

import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { Logger as MatterLogger, Level as MatterLevel } from '@project-chip/matter.js/log';

// Determine log level from environment
const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';
const isDebugger = typeof v8debug === 'object' || /--inspect/.test(process.execArgv.join(' '));
const logFormat = (process.env.LOG_FORMAT || process.env.MATTER_LOG_FORMAT || 'auto').toLowerCase();

// Determine pretty stream usage: prefer programmatic pretty in dev or LOG_FORMAT=plain
const usePretty = (isDevelopment && !isTest) || logFormat === 'plain';
let baseLogger;

if (isTest) {
  // Test mode: simple silent logger
  baseLogger = pino({ level: 'silent' });
} else if (usePretty) {
  // Development/plain format mode: use pino-pretty with custom formatter
  const pad = (s, n) => String(s).padEnd(n, ' ');
  const lvlMap = { 10: 'TRACE', 20: 'DEBUG', 30: 'INFO', 40: 'WARN', 50: 'ERROR', 60: 'FATAL' };
  const messageFormat = (log, messageKey) => {
    const ts = log.time ? new Date(log.time) : new Date();
    const lvl = pad(lvlMap[log.level] || 'INFO', 5);
    const facility = pad(log.facility || 'app', 20);
    const msg = log[messageKey] ?? '';
    const timeStr = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')} ${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}:${String(ts.getSeconds()).padStart(2, '0')}.${String(ts.getMilliseconds()).padStart(3, '0')}`;
    return `${timeStr} ${lvl} ${facility} ${msg}`;
  };
  
  const prettyStream = pinoPretty({
    colorize: isDevelopment,
    sync: true,
    ignore: 'pid,hostname,facility,time,level',
    messageFormat,
    hideObject: true,
    customPrettifiers: {},
  });
  baseLogger = pino({ level: envLevel }, prettyStream);
} else {
  // Production JSON mode
  baseLogger = pino({ level: envLevel });
}

// Create child loggers for different facilities
const rttLogger = baseLogger.child({ facility: 'rtt-checker' });
const matterLogger = baseLogger.child({ facility: 'matter-server' });
const bridgeLogger = baseLogger.child({ facility: 'rtt-bridge' });

// Export unified log interface
// Maintain backward compatibility with matter.js style: log.info(msg, ...args)
export const log = {
  error: (msg, ...args) => {
    if (args.length === 0) {
      rttLogger.error(msg);
    } else {
      rttLogger.error({ args }, msg);
    }
  },
  warn: (msg, ...args) => {
    if (args.length === 0) {
      rttLogger.warn(msg);
    } else {
      rttLogger.warn({ args }, msg);
    }
  },
  info: (msg, ...args) => {
    if (args.length === 0) {
      rttLogger.info(msg);
    } else {
      rttLogger.info({ args }, msg);
    }
  },
  debug: (msg, ...args) => {
    if (args.length === 0) {
      rttLogger.debug(msg);
    } else {
      rttLogger.debug({ args }, msg);
    }
  },
};

// Export facility-specific loggers
export const loggers = {
  rtt: rttLogger,
  matter: matterLogger,
  bridge: bridgeLogger,
};

// Map Pino levels to Matter.js levels
const pinoToMatterLevel = {
  trace: MatterLevel.DEBUG,
  debug: MatterLevel.DEBUG,
  info: MatterLevel.INFO,
  warn: MatterLevel.WARN,
  error: MatterLevel.ERROR,
  fatal: MatterLevel.FATAL,
};

// Configure Matter.js logger to use our Pino-based system
const matterLevel = pinoToMatterLevel[envLevel] ?? MatterLevel.INFO;
MatterLogger.defaultLogLevel = matterLevel;
MatterLogger.format = process.env.MATTER_LOG_FORMAT || 'ansi';

// Bridge Matter.js logger output to Pino
const originalConsoleLogger = MatterLogger.log;
if (originalConsoleLogger) {
  // Intercept matter.js log output and route through Pino
  MatterLogger.log = function (level, formattedLog) {
    let logMsg = typeof formattedLog === 'string' ? formattedLog : String(formattedLog);

    // Strip matter.js's own formatting to avoid double-logging
    // Pattern: "YYYY-MM-DD HH:mm:ss.SSS LEVEL  Facility  Message"
    // Also handle ANSI color codes
    const matterFormatRegex = /^\u001b\[\d+m?\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \w+\s+\u001b\[\d+;?\d*m?(\w+)\s+\u001b\[\d+;?\d*m?(.*)$/;
    const plainFormatRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \w+\s+(\w+)\s+(.*)$/;
    
    let match = logMsg.match(matterFormatRegex) || logMsg.match(plainFormatRegex);
    if (match) {
      // Extract just the message part, strip ANSI codes
      logMsg = match[2] || match[1];
      logMsg = logMsg.replace(/\u001b\[\d+;?\d*m/g, '');
    }

    switch (level) {
      case MatterLevel.FATAL:
      case MatterLevel.ERROR:
        matterLogger.error(logMsg);
        break;
      case MatterLevel.WARN:
        matterLogger.warn(logMsg);
        break;
      case MatterLevel.INFO:
        matterLogger.info(logMsg);
        break;
      case MatterLevel.DEBUG:
        matterLogger.debug(logMsg);
        break;
      default:
        matterLogger.info(logMsg);
    }
  };
}

// Set log level dynamically
export function setLogLevel(level) {
  const normalizedLevel = level.toLowerCase();

  // Handle special case for 'silent' which stops all logging
  if (normalizedLevel === 'silent') {
    baseLogger.level = 'silent';
    MatterLogger.defaultLogLevel = MatterLevel.FATAL + 1; // Above all levels
  } else {
    // Validate level exists in Pino
    const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    if (validLevels.includes(normalizedLevel)) {
      baseLogger.level = normalizedLevel;
    }

    // Update Matter.js level as well
    const matterLevel = pinoToMatterLevel[normalizedLevel];
    if (matterLevel !== undefined) {
      MatterLogger.defaultLogLevel = matterLevel;
    }
  }

  process.env.LOG_LEVEL = level;
}

// Cleanup function for test environments (no-op now, kept for compatibility)
export function cleanupLoggerIntervals() {
  // Pino doesn't use intervals, so nothing to clean up
}

// Re-export Matter.js Logger and Level for tests and advanced usage
export { MatterLogger as Logger, MatterLevel as Level };

// Add logLevels compatibility shim for tests that expect it
MatterLogger.logLevels = MatterLogger.logLevels || {};
