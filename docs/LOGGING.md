# Logging

Uses **Pino** as the primary logging framework with automatic bridging to matter.js Logger for unified application + protocol logs.

## Architecture

- **Primary Logger**: [Pino](https://github.com/pinojs/pino) - Fast, low-overhead JSON logger
- **Matter.js Integration**: Automatic bridging routes matter.js logs through Pino
- **Pretty Printing**: Development mode uses `pino-pretty` for human-readable output
- **Production**: Structured JSON logs for log aggregation systems

## Levels

Set via `LOG_LEVEL` environment variable. Supports: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, `silent`.

```bash
export LOG_LEVEL="trace"  # Most verbose (includes debug)
export LOG_LEVEL="debug"  # Verbose output
export LOG_LEVEL="info"   # Default - normal operation
export LOG_LEVEL="warn"   # Production - warnings and errors only
export LOG_LEVEL="error"  # Minimal - errors only
export LOG_LEVEL="fatal"  # Critical errors only
export LOG_LEVEL="silent" # Disable all logging
```

## Facilities

Application loggers use child contexts for easy filtering:

- `rtt-checker`: Main application logger
- `matter-server`: Matter.js protocol logs (bridged from matter.js)
- `rtt-bridge`: RTT API integration logs

## Usage Examples

### Basic

```javascript
import { log, loggers } from './utils/logger.js';

// Use default logger (rtt-checker facility)
log.info('Application started');
log.debug('Debug details', { user: 'admin' });
log.error('Error occurred');

// Use facility-specific loggers
loggers.bridge.debug('Searching RTT API...');
loggers.matter.info('Matter server started');
```

### Dynamic Level Changes

```javascript
import { setLogLevel } from './utils/logger.js';

// Change level at runtime
setLogLevel('debug'); // Enable verbose logging
setLogLevel('warn'); // Reduce noise
```

### Matter.js Integration

The logger automatically bridges matter.js logs to Pino:

```javascript
// matter.js logs are automatically routed through Pino
// No additional configuration needed
```

### Env Vars

```bash
# Application log level (applies to all facilities by default)
export LOG_LEVEL="debug"

# Matter.js format (plain, ansi, html) - defaults to 'ansi'
export MATTER_LOG_FORMAT="ansi"   # Colored output (default)
export MATTER_LOG_FORMAT="plain"  # No colors

# Individual facility levels (comma-separated)
export MATTER_LOG_LEVEL="MdnsScanner:warn,Storage:error"
```

### Global Floor

Lower-level output (< global `LOG_LEVEL`) is suppressed; per‑facility debug only visible if global level permits.

### Timed Exit

Use `EXIT_AFTER_MS` for short runs:

```bash
LOG_LEVEL=info EXIT_AFTER_MS=2500 RTT_USER=demo RTT_PASS=demo node index.js
```

This starts the app, emits a few log lines at the enforced level, then shuts down gracefully after the given milliseconds.

### Manual Check

```bash
# Suppress debug
LOG_LEVEL=info EXIT_AFTER_MS=2500 RTT_USER=demo RTT_PASS=demo node index.js

# Show debug
LOG_LEVEL=debug EXIT_AFTER_MS=2000 RTT_USER=demo RTT_PASS=demo node index.js
```

If `LOG_LEVEL=info` shows any line with `DEBUG`, investigate; the guards should prevent this.

### Test

`tests/logger.runtime.test.js` asserts suppression at `info` and presence at `debug`.

### Format

`MATTER_LOG_FORMAT=ansi|plain|html` (default `ansi`).

### Patterns

| Goal                  | Recommendation                                                  |
| --------------------- | --------------------------------------------------------------- |
| Quiet production      | `LOG_LEVEL=warn` (optionally bump specific facility to `ERROR`) |
| Standard monitoring   | `LOG_LEVEL=info`                                                |
| Full troubleshooting  | `LOG_LEVEL=debug`                                               |
| Short CI verification | Add `EXIT_AFTER_MS` (1–3s) and `MATTER_LOG_FORMAT=plain`        |

## Examples

INFO:

```
2024-11-26 14:30:15.123 [rtt-checker] INFO: 🚆 Device started
2024-11-26 14:30:15.456 [matter-server] INFO: 📡 Matter server created
2024-11-26 14:30:20.789 [rtt-bridge] INFO: ✓ Train found: 14:35 Cambridge → Kings Cross
2024-11-26 14:30:20.800 [rtt-checker] INFO: ✅ Status: ON_TIME → Late (5m)
```

DEBUG:

```
2024-11-26 14:30:15.123 [rtt-checker] DEBUG: Initializing device with update interval 60000ms
2024-11-26 14:30:15.456 [matter-server] DEBUG: Creating endpoints with bridge enabled
2024-11-26 14:30:20.789 [rtt-bridge] DEBUG: RTT API request: CAMBDGE → KNGX
2024-11-26 14:30:20.795 [rtt-bridge] DEBUG: Found 12 candidate trains
2024-11-26 14:30:20.796 [rtt-bridge] DEBUG: Selected train: 14:35 (arrives 16:15, +5m delay)
2024-11-26 14:30:20.800 [rtt-checker] INFO: ✅ Status: ON_TIME → Late (5m)
```

## Benefits

1. Unified formatting
2. Facility granularity
3. Colored / custom formatting
4. No extra dependency

```javascript
// Debug only RTT API, quiet everything else
Logger.defaultLogLevel = Level.WARN;
Logger.logLevels = { 'rtt-bridge': Level.DEBUG };
```

## Testing

```javascript
import { loggers } from './src/utils/logger.js';

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

## Migration

Previous custom logger replaced; public API unchanged (`log.*`, `setLogLevel`). Facility loggers added.

## See Also

- [matter.js Logger documentation](https://github.com/project-chip/matter.js/blob/main/docs/LOGGING.md)
- [Log format reference](https://github.com/project-chip/matter.js/blob/main/packages/general/src/log/LogFormat.ts)
