// Independent centralized logger using Pino
// Provides bridge to configure matter.js Logger to use our logging system

import pino from 'pino';
import { Logger as MatterLogger, Level as MatterLevel } from '@project-chip/matter.js/log';

// Determine log level from environment
const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';
const isDebugger = typeof v8debug === 'object' || /--inspect/.test(process.execArgv.join(' '));

// Configure Pino logger with pretty printing in development
// Use sync pretty print when debugging (VS Code) to avoid worker thread issues
const pinoConfig = {
  level: isTest ? 'silent' : envLevel,
  ...(isDevelopment && !isTest
    ? isDebugger
      ? {
          // Synchronous pretty printing for debuggers (VS Code, etc.)
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'yyyy-mm-dd HH:MM:ss.l',
              ignore: 'pid,hostname',
              sync: true, // Critical: prevents worker thread issues in debuggers
            },
          },
        }
      : {
          // Async pretty printing for normal terminal use
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'yyyy-mm-dd HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          },
        }
    : {}),
};

// Create base logger
const baseLogger = pino(pinoConfig);

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
    const logMsg = typeof formattedLog === 'string' ? formattedLog : String(formattedLog);

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
