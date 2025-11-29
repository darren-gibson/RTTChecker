// Silence or stub src/logger.js during tests to reduce noise
import * as realLogger from '../src/logger.js';

// Replace console-level logging with no-ops in tests
const noop = () => {};

// If module exports `Logger` and top-level functions, patch them
try {
  if (realLogger.Logger && typeof realLogger.Logger.get === 'function') {
    const silent = {
      trace: noop,
      debug: noop,
      info: noop,
      warn: noop,
      error: noop,
      fatal: noop,
      setLogLevel: noop,
      getLogLevel: () => 'error',
    };
    // Monkey-patch get() to always return silent logger in tests
    const originalGet = realLogger.Logger.get.bind(realLogger.Logger);
    realLogger.Logger.get = (...args) => {
      try { originalGet(...args); } catch (_) {}
      return silent;
    };
  }
  if (typeof realLogger.setLogLevel === 'function') {
    realLogger.setLogLevel('error');
  }
} catch (_) {
  // Ignore if logger shape changes; tests should still run.
}
