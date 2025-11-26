# Logging Architecture

## Overview

RTTChecker uses **matter.js's built-in Logger** for consistent, facility-based logging across the entire application. This provides:

- **Unified logging** with both application and Matter protocol messages
- **Facility-based organization** for granular control
- **Consistent formatting** across all components
- **Advanced features** like colored output and custom formatters

## Log Levels

The application supports the following log levels (from least to most verbose):

| Level | Value | Description | Use Case |
|-------|-------|-------------|----------|
| `ERROR` | 4 | Critical failures | Production error tracking |
| `WARN` | 3 | Warnings and retryable issues | Production monitoring |
| `INFO` | 1 | Normal operations | **Default** - General monitoring |
| `DEBUG` | 0 | Verbose details | Development and troubleshooting |

Set via the `LOG_LEVEL` environment variable:

```bash
export LOG_LEVEL="debug"  # Verbose output
export LOG_LEVEL="info"   # Default
export LOG_LEVEL="warn"   # Production
export LOG_LEVEL="error"  # Minimal output
```

## Logging Facilities

The application organizes logs into facilities for granular control:

### Application Facilities

| Facility | Module | Purpose |
|----------|--------|---------|
| `rtt-checker` | `MatterDevice.js` | Device lifecycle, periodic updates |
| `matter-server` | `MatterServer.js` | Matter server initialization, commissioning |
| `rtt-bridge` | `RTTBridge.js`, `trainSelection.js` | RTT API calls, train selection |

### Matter.js Native Facilities

When matter.js is running, you'll also see logs from:
- `MatterServer` - Core Matter protocol operations
- `CommissioningServer` - Device pairing and commissioning
- `MdnsScanner` - mDNS service discovery
- `Storage` - Persistence operations
- And many more...

## Usage Examples

### Basic Usage

```javascript
import { log, loggers } from './logger.js';

// Use default logger (rtt-checker facility)
log.info('Application started');
log.debug('Debug details');
log.error('Error occurred');

// Use facility-specific loggers
loggers.bridge.debug('Searching RTT API...');
loggers.matter.info('Matter server started');
```

### Advanced Configuration

For fine-grained control over specific facilities:

```javascript
import { Logger, Level } from '@project-chip/matter.js/log';

// Set level for specific facility
Logger.logLevels = {
  'rtt-bridge': Level.DEBUG,        // Verbose RTT API logs
  'matter-server': Level.INFO,      // Normal Matter logs
  'MdnsScanner': Level.WARN,        // Quiet mDNS scanner
};

// Enable colored output
Logger.format = 'ansi';

// Use custom formatter
Logger.logFormatter = (now, level, facility, prefix, values) => {
  return `[${facility}] ${values.join(' ')}`;
};
```

### Environment Variables

Control logging behavior via environment:

```bash
# Application log level (applies to all facilities by default)
export LOG_LEVEL="debug"

# Matter.js format (plain, ansi, html) - defaults to 'ansi'
export MATTER_LOG_FORMAT="ansi"   # Colored output (default)
export MATTER_LOG_FORMAT="plain"  # No colors

# Individual facility levels (comma-separated)
export MATTER_LOG_LEVEL="MdnsScanner:warn,Storage:error"
```

## Log Output Examples

### INFO Level (Default)
```
2024-11-26 14:30:15.123 [rtt-checker] INFO: 🚆 Device started
2024-11-26 14:30:15.456 [matter-server] INFO: 📡 Matter server created
2024-11-26 14:30:20.789 [rtt-bridge] INFO: ✓ Train found: 14:35 Cambridge → Kings Cross
2024-11-26 14:30:20.800 [rtt-checker] INFO: ✅ Status: ON_TIME → Late (5m)
```

### DEBUG Level
```
2024-11-26 14:30:15.123 [rtt-checker] DEBUG: Initializing device with update interval 60000ms
2024-11-26 14:30:15.456 [matter-server] DEBUG: Creating endpoints with bridge enabled
2024-11-26 14:30:20.789 [rtt-bridge] DEBUG: RTT API request: CAMBDGE → KNGX
2024-11-26 14:30:20.795 [rtt-bridge] DEBUG: Found 12 candidate trains
2024-11-26 14:30:20.796 [rtt-bridge] DEBUG: Selected train: 14:35 (arrives 16:15, +5m delay)
2024-11-26 14:30:20.800 [rtt-checker] INFO: ✅ Status: ON_TIME → Late (5m)
```

## Benefits of matter.js Logger

### 1. Consistent Formatting
All logs (application + Matter protocol) use the same format and timestamp.

### 2. Facility-Based Control
Fine-tune verbosity for specific components:
```javascript
// Debug only RTT API, quiet everything else
Logger.defaultLogLevel = Level.WARN;
Logger.logLevels = { 'rtt-bridge': Level.DEBUG };
```

### 3. Advanced Features
- **Colored output** with ANSI formatting
- **Custom formatters** for structured logging
- **Log capture** for testing
- **Nested context** for hierarchical operations

### 4. No Dependencies
matter.js Logger is already included, no additional logging libraries needed.

## Testing Considerations

The logger exports facility-specific loggers that can be mocked in tests:

```javascript
import { loggers } from '../src/logger.js';

// Mock specific facility
const originalBridge = loggers.bridge;
loggers.bridge = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// ... run tests ...

// Restore
loggers.bridge = originalBridge;
```

## Migration Notes

The previous custom logger has been replaced with matter.js Logger while maintaining the same public API:

- `log.debug()`, `log.info()`, `log.warn()`, `log.error()` - Work exactly the same
- `setLogLevel(level)` - Still available for dynamic level changes
- New: `loggers.rtt`, `loggers.matter`, `loggers.bridge` - Facility-specific loggers

No changes required to existing logging calls in the codebase.

## See Also

- [matter.js Logger documentation](https://github.com/project-chip/matter.js/blob/main/docs/LOGGING.md)
- [Log format reference](https://github.com/project-chip/matter.js/blob/main/packages/general/src/log/LogFormat.ts)
