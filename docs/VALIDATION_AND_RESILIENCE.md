# Validation and Resilience Patterns

This document describes the validation utilities and resilience patterns implemented in RTTChecker.

## Table of Contents

- [Validation Utilities](#validation-utilities)
- [Circuit Breaker Pattern](#circuit-breaker-pattern)
- [Resilient Request Wrapper](#resilient-request-wrapper)
- [Integration Examples](#integration-examples)
- [Best Practices](#best-practices)

## Validation Utilities

Located in `src/utils/validation.js`, provides reusable input validation functions following DRY principles.

### Available Functions

#### `isTiploc(value)`

Validates UK railway TIPLOC codes (Timing Point Location).

- **Valid**: 1-7 uppercase alphanumeric characters
- **Examples**: `"PADTON"`, `"WATRLO"`, `"RDNG"`

```javascript
import { isTiploc } from './src/utils/validation.js';

if (!isTiploc(stationCode)) {
  throw new Error('Invalid TIPLOC code');
}
```

#### `isWithinRange(value, min, max, inclusive = true)`

Validates numeric values within a specified range.

```javascript
import { isWithinRange } from './src/utils/validation.js';

// Temperature must be between -50 and 50 (inclusive)
if (!isWithinRange(temperature, -50, 50)) {
  throw new Error('Temperature out of range');
}
```

#### `isValidPort(port)`

Validates network port numbers (1-65535).

```javascript
import { isValidPort } from './src/utils/validation.js';

if (!isValidPort(config.port)) {
  throw new Error('Invalid port number');
}
```

#### `isValidDiscriminator(discriminator)`

Validates Matter device discriminators (0-4095).

```javascript
import { isValidDiscriminator } from './src/utils/validation.js';

if (!isValidDiscriminator(config.discriminator)) {
  throw new Error('Invalid discriminator');
}
```

#### `isValidPasscode(passcode)`

Validates Matter device passcodes (20000000-99999999, excluding test codes).

```javascript
import { isValidPasscode } from './src/utils/validation.js';

if (!isValidPasscode(config.passcode)) {
  throw new Error('Invalid Matter passcode');
}
```

#### `isValidDeviceName(name)`

Validates device names (1-32 printable ASCII characters, no leading/trailing spaces).

```javascript
import { isValidDeviceName } from './src/utils/validation.js';

if (!isValidDeviceName(deviceName)) {
  throw new Error('Invalid device name');
}
```

#### `isValidLogLevel(level)`

Validates Pino log levels.

```javascript
import { isValidLogLevel } from './src/utils/validation.js';

if (!isValidLogLevel(config.logLevel)) {
  throw new Error('Invalid log level');
}
```

#### `isValidMatterLogFormat(format)`

Validates Matter.js log format strings.

```javascript
import { isValidMatterLogFormat } from './src/utils/validation.js';

if (!isValidMatterLogFormat(config.matterLogFormat)) {
  throw new Error('Invalid Matter log format');
}
```

#### `sanitizeTiploc(value)`

Sanitizes and normalizes TIPLOC codes.

```javascript
import { sanitizeTiploc } from './src/utils/validation.js';

const cleaned = sanitizeTiploc('  padton  '); // Returns "PADTON"
```

#### `clampValue(value, min, max)`

Clamps numeric values to a specified range.

```javascript
import { clampValue } from './src/utils/validation.js';

const temperature = clampValue(reading, -50, 50); // Ensures -50 ≤ temperature ≤ 50
```

---

## Circuit Breaker Pattern

Located in `src/utils/circuitBreaker.js`, implements the Circuit Breaker pattern to prevent cascading failures.

### Circuit States

- **CLOSED**: Normal operation, requests flow through
- **OPEN**: Service failing, requests rejected immediately (fail-fast)
- **HALF_OPEN**: Testing recovery, limited requests allowed

### State Transitions

```
CLOSED ────[Failure Threshold]────> OPEN
  ↑                                   ↓
  └──[Success Threshold]──── HALF_OPEN
                                      ↓
                                   [Failure]
                                      ↓
                                    OPEN
```

### Basic Usage

```javascript
import { CircuitBreaker, CircuitState } from './src/utils/circuitBreaker.js';

const breaker = new CircuitBreaker({
  failureThreshold: 5, // Open after 5 failures
  successThreshold: 2, // Close after 2 successes in half-open
  timeout: 60000, // Wait 60s before trying again
});

try {
  const result = await breaker.execute(async () => {
    return await callExternalService();
  });
} catch (error) {
  if (error.circuitBreakerOpen) {
    console.log('Service temporarily unavailable');
  } else {
    console.error('Service error:', error);
  }
}
```

### Configuration Options

```javascript
const breaker = new CircuitBreaker({
  failureThreshold: 5, // Failures before opening circuit
  successThreshold: 2, // Successes to close circuit
  timeout: 60000, // Circuit open timeout (ms)

  // Optional callbacks
  onStateChange: ({ from, to, breaker }) => {
    console.log(`Circuit: ${from} → ${to}`);
  },
  onFailure: ({ error, breaker }) => {
    console.log(`Failure ${breaker.getFailureCount()}/${breaker.failureThreshold}`);
  },
  onSuccess: ({ breaker }) => {
    console.log('Operation succeeded');
  },
});
```

### Monitoring Circuit Health

```javascript
// Check current state
console.log(breaker.getState()); // "CLOSED" | "OPEN" | "HALF_OPEN"
console.log(breaker.isOpen()); // true/false

// Get detailed statistics
const stats = breaker.getStats();
console.log(stats);
// {
//   state: "OPEN",
//   failureCount: 5,
//   successCount: 0,
//   failureThreshold: 5,
//   successThreshold: 2,
//   timeout: 60000,
//   nextAttemptTime: 1234567890,
//   lastError: { message: "...", name: "Error" }
// }
```

### Manual Control

```javascript
// Manually reset circuit (e.g., after fixing backend issue)
breaker.reset();

// Manually open circuit (e.g., for maintenance)
breaker.open();
```

---

## Resilient Request Wrapper

Located in `src/utils/resilientRequest.js`, combines Circuit Breaker + Retry patterns for comprehensive fault tolerance.

### Key Features

- **Circuit Breaker**: Prevents cascading failures
- **Exponential Backoff**: Retry with increasing delays
- **Jitter**: Randomized delays to prevent thundering herd
- **HTTP-aware**: Smart retry based on status codes (429, 5xx)
- **Logging Integration**: Pino logger support
- **Singleton Pattern**: Share circuit state across call sites

### Basic Usage

```javascript
import { ResilientRequest } from './src/utils/resilientRequest.js';

const resilient = new ResilientRequest({
  // Circuit breaker config
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,

  // Retry config
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,

  // Optional logger
  logger: myLogger,
});

// Execute any async operation
const data = await resilient.execute(async () => {
  return await fetchData();
});

// Or use built-in HTTP JSON fetcher
const result = await resilient.fetchJson('https://api.example.com/data', {
  headers: { Authorization: 'Bearer token' },
});
```

### Singleton Factory Pattern

Share circuit breaker state across multiple call sites:

```javascript
import { createResilientClient } from './src/utils/resilientRequest.js';

// In RTTBridge.js
const rttClient = createResilientClient('RTT_API', {
  failureThreshold: 5,
  timeout: 60000,
  logger: myLogger,
});

// Multiple calls share the same circuit breaker
const search = await rttClient.fetchJson('https://api/search');
const service = await rttClient.fetchJson('https://api/service/123');

// In another module
const sameClient = createResilientClient('RTT_API'); // Gets the same instance
```

### Monitoring and Control

```javascript
// Check circuit state
console.log(resilient.getCircuitState()); // "CLOSED" | "OPEN" | "HALF_OPEN"
console.log(resilient.isCircuitOpen()); // true/false

// Get statistics
const stats = resilient.getStats();
console.log(`Failures: ${stats.failureCount}/${stats.failureThreshold}`);

// Manual control
resilient.resetCircuit(); // Reset to CLOSED
resilient.openCircuit(); // Force OPEN (maintenance mode)
```

### State Change Callbacks

```javascript
const resilient = new ResilientRequest({
  failureThreshold: 5,

  onCircuitOpen: (breaker) => {
    // Alert team, update metrics, disable feature flag, etc.
    metrics.increment('circuit_breaker.opened');
    alerting.send('RTT API circuit opened');
  },

  onCircuitClose: (breaker) => {
    // Log recovery, update metrics, re-enable feature
    metrics.increment('circuit_breaker.closed');
    logger.info('RTT API recovered');
  },
});
```

---

## Integration Examples

### Example 1: RTT API Client with Full Protection

```javascript
import { createResilientClient } from './src/utils/resilientRequest.js';
import { isValidPort, sanitizeTiploc } from './src/utils/validation.js';
import { createLogger } from './src/utils/logger.js';

const logger = createLogger({ facility: 'rtt-api' });

// Create singleton client for RTT API
const rttClient = createResilientClient('RTT_API', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
  maxRetries: 3,
  logger,
  onCircuitOpen: () => {
    logger.error('RTT API circuit opened - service degraded');
  },
});

export async function searchTrains(from, to) {
  // Validate inputs
  const fromTiploc = sanitizeTiploc(from);
  const toTiploc = sanitizeTiploc(to);

  if (!isTiploc(fromTiploc) || !isTiploc(toTiploc)) {
    throw new Error('Invalid TIPLOC codes');
  }

  // Make resilient request
  try {
    return await rttClient.fetchJson(`https://api.rtt.io/search/${fromTiploc}/to/${toTiploc}`, {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });
  } catch (error) {
    if (error.circuitBreakerOpen) {
      logger.warn('Service temporarily unavailable');
      throw new ServiceUnavailableError('RTT API circuit open');
    }
    throw error;
  }
}
```

### Example 2: Configuration Validation

```javascript
import {
  isValidPort,
  isValidDiscriminator,
  isValidPasscode,
  isValidLogLevel,
  clampValue,
} from './src/utils/validation.js';

export function validateConfig(config) {
  const errors = [];

  // Validate port
  if (!isValidPort(config.port)) {
    errors.push(`Invalid port: ${config.port} (must be 1-65535)`);
  }

  // Validate discriminator
  if (!isValidDiscriminator(config.discriminator)) {
    errors.push(`Invalid discriminator: ${config.discriminator} (must be 0-4095)`);
  }

  // Validate passcode
  if (!isValidPasscode(config.passcode)) {
    errors.push(`Invalid passcode: ${config.passcode}`);
  }

  // Validate log level
  if (!isValidLogLevel(config.logLevel)) {
    errors.push(`Invalid log level: ${config.logLevel}`);
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }

  // Clamp numeric values to safe ranges
  return {
    ...config,
    pollInterval: clampValue(config.pollInterval, 1000, 3600000), // 1s to 1h
    timeout: clampValue(config.timeout, 1000, 60000), // 1s to 60s
  };
}
```

### Example 3: Multi-Service Coordination

```javascript
import { createResilientClient } from './src/utils/resilientRequest.js';

// Separate circuits for each service
const rttClient = createResilientClient('RTT_API', {
  failureThreshold: 5,
  timeout: 60000,
});

const weatherClient = createResilientClient('WEATHER_API', {
  failureThreshold: 3,
  timeout: 30000,
});

export async function getTrainWithWeather(trainId) {
  const results = await Promise.allSettled([
    rttClient.fetchJson(`https://rtt.api/trains/${trainId}`),
    weatherClient.fetchJson(`https://weather.api/current`),
  ]);

  return {
    train: results[0].status === 'fulfilled' ? results[0].value : null,
    weather: results[1].status === 'fulfilled' ? results[1].value : null,
    rttAvailable: !rttClient.isCircuitOpen(),
    weatherAvailable: !weatherClient.isCircuitOpen(),
  };
}
```

---

## Best Practices

### 1. Choose Appropriate Thresholds

```javascript
// Fast-failing service (e.g., authentication)
const authClient = new ResilientRequest({
  failureThreshold: 3, // Open quickly
  timeout: 10000, // Retry after 10s
});

// Critical service (e.g., payment)
const paymentClient = new ResilientRequest({
  failureThreshold: 2, // Very sensitive
  timeout: 120000, // Long recovery time
  maxRetries: 1, // Don't spam
});

// Non-critical service (e.g., analytics)
const analyticsClient = new ResilientRequest({
  failureThreshold: 10, // More tolerant
  timeout: 30000, // Quick recovery
  maxRetries: 0, // Don't retry
});
```

### 2. Validate Early, Fail Fast

```javascript
import { isTiploc, sanitizeTiploc } from './src/utils/validation.js';

export async function searchTrains(from, to) {
  // Validate BEFORE making expensive network calls
  const fromClean = sanitizeTiploc(from);
  const toClean = sanitizeTiploc(to);

  if (!isTiploc(fromClean)) {
    throw new ValidationError(`Invalid origin: ${from}`);
  }
  if (!isTiploc(toClean)) {
    throw new ValidationError(`Invalid destination: ${to}`);
  }

  // Now make the protected request
  return await rttClient.fetchJson(`/search/${fromClean}/to/${toClean}`);
}
```

### 3. Use Singleton Pattern for Shared State

```javascript
// ❌ BAD: Each call gets its own circuit breaker
async function badPattern() {
  const client = new ResilientRequest(); // New circuit each time!
  return await client.fetchJson(url);
}

// ✅ GOOD: Share circuit breaker across calls
const sharedClient = createResilientClient('MY_SERVICE');

async function goodPattern() {
  return await sharedClient.fetchJson(url);
}
```

### 4. Monitor Circuit Health

```javascript
// Export metrics for monitoring
export function getHealthMetrics() {
  return {
    rtt: {
      state: rttClient.getCircuitState(),
      isHealthy: !rttClient.isCircuitOpen(),
      stats: rttClient.getStats(),
    },
    weather: {
      state: weatherClient.getCircuitState(),
      isHealthy: !weatherClient.isCircuitOpen(),
      stats: weatherClient.getStats(),
    },
  };
}

// Expose on health endpoint
app.get('/health', (req, res) => {
  const metrics = getHealthMetrics();
  const allHealthy = Object.values(metrics).every((m) => m.isHealthy);

  res.status(allHealthy ? 200 : 503).json(metrics);
});
```

### 5. Handle Circuit Open Gracefully

```javascript
export async function getTrainStatus(trainId) {
  try {
    return await rttClient.fetchJson(`/trains/${trainId}`);
  } catch (error) {
    if (error.circuitBreakerOpen) {
      // Return cached data or default value
      logger.warn('Circuit open, returning cached data');
      return (
        getCachedTrainStatus(trainId) || {
          status: 'unknown',
          message: 'Service temporarily unavailable',
        }
      );
    }
    throw error; // Re-throw other errors
  }
}
```

### 6. Provide Manual Override

```javascript
// Admin API for manual circuit control
app.post('/admin/circuit/:service/reset', async (req, res) => {
  const { service } = req.params;

  if (service === 'rtt') {
    rttClient.resetCircuit();
    logger.info('RTT circuit manually reset');
    res.json({ status: 'reset', service: 'rtt' });
  } else {
    res.status(404).json({ error: 'Unknown service' });
  }
});
```

---

## Testing

All utilities have comprehensive test coverage:

- **validation.js**: 90+ test assertions
- **circuitBreaker.js**: 27 tests covering all states and transitions
- **resilientRequest.js**: 22 tests covering integration scenarios

Run tests:

```bash
npm test -- validation
npm test -- circuitBreaker
npm test -- resilientRequest
```

---

## References

- [Circuit Breaker Pattern (Martin Fowler)](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [DRY Principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
