# Configuration Validation & API Retry Implementation

## Overview

Added two key improvements to the RTT Checker application:

1. **Zod Schema Validation** for environment variables
2. **Retry/Backoff Logic** for RTT API calls

## 1. Zod Schema Validation

### What Changed

- Added `zod` dependency for runtime schema validation
- Enhanced `validateConfig()` in `src/config.js` with comprehensive validation rules
- Validates all environment variables with appropriate types and ranges

### Validation Rules

**Required Fields:**
- `RTT_USER`: Non-empty string
- `RTT_PASS`: Non-empty string

**Optional Fields with Validation:**
- `ORIGIN_TIPLOC`, `DEST_TIPLOC`: 3-8 uppercase alphanumeric characters
- `MIN_AFTER_MINUTES`: Integer 0-1440
- `WINDOW_MINUTES`: Integer 1-1440
- `PORT`: Integer 1-65535
- `NODE_ENV`: Enum (development, production, test)
- `DISCRIMINATOR`: Integer 0-4095
- `PASSCODE`: Integer 1-99999999
- `LOG_LEVEL`: Enum (debug, info, warn, error)
- `MATTER_LOG_FORMAT`: Enum (ansi, plain, html)
- `USE_BRIDGE`: Enum (true, false)
- Device name fields: Max 64 characters

### Benefits

- **Early Error Detection**: Catch configuration errors at startup
- **Clear Error Messages**: Zod provides detailed validation messages
- **Type Safety**: Runtime type checking for all environment variables
- **Documentation**: Schema serves as documentation for valid values

### Example Error Output

```
❌ Configuration validation failed:
   • PORT: Too big: expected number to be <=65535
   • ORIGIN_TIPLOC: ORIGIN_TIPLOC must be 3-8 uppercase alphanumeric characters

Please fix the configuration errors and restart.
See README.md for configuration details.
```

## 2. RTT API Retry/Backoff Logic

### What Changed

- Enhanced `rttSearch()` in `src/RTTBridge.js` with intelligent retry logic
- Implements exponential backoff with jitter for retryable errors
- Fast-fails on authentication/authorization errors

### Retry Strategy

**Retryable Errors (with exponential backoff):**
- `429` Too Many Requests (rate limiting)
- `500`, `502`, `503`, `504` Server errors
- Network errors (connection failures, timeouts)

**Non-Retryable Errors (fast fail):**
- `400` Bad Request
- `401` Unauthorized
- `403` Forbidden
- `404` Not Found

### Retry Configuration

```javascript
{
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  nonRetryableStatusCodes: [400, 401, 403, 404]
}
```

### Backoff Algorithm

- **Base delay**: 1000ms
- **Exponential growth**: delay = baseDelay * 2^attempt
- **Jitter**: Up to 30% random variation to prevent thundering herd
- **Max delay**: Capped at 10000ms

**Example delay sequence:**
- Attempt 1: ~1000-1300ms
- Attempt 2: ~2000-2600ms
- Attempt 3: ~4000-5200ms (capped at 10000ms)

### Benefits

- **Resilience**: Automatically recovers from transient failures
- **Rate Limit Handling**: Backs off on 429 errors
- **Fast Failure**: Doesn't waste time on permanent errors (401, 403)
- **Observability**: Logs retry attempts and outcomes

### Example Log Output

```
2025-11-29 11:27:15.292 INFO   rtt-bridge   Retry attempt 1/3 after 1278ms delay
2025-11-29 11:27:16.578 INFO   rtt-bridge   Retry attempt 2/3 after 2312ms delay
2025-11-29 11:27:19.264 INFO   rtt-bridge   Request succeeded after 2 retries
```

## Testing

### New Tests Added

**Zod Validation Tests** (`tests/config.zod.test.js`):
- ✓ Validates required fields
- ✓ Validates TIPLOC format
- ✓ Validates numeric ranges
- ✓ Validates discriminator range
- ✓ Passes with valid configuration

**Retry Logic Tests** (`tests/RTTBridge.test.js`):
- ✓ Throws on non-ok after retries (502 server error)
- ✓ Fast fails on 401 without retries (auth error)
- ✓ Retries on 429 rate limit (eventually succeeds)

### Test Results

```
Test Suites: 11 passed, 11 total
Tests:       114 passed, 114 total
```

## Usage

### Zod Validation

Validation runs automatically when `validateConfig()` is called:

```javascript
import { validateConfig } from './src/config.js';

try {
  validateConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
```

### Retry Logic

Retry logic is transparent and automatic:

```javascript
import { rttSearch } from './src/RTTBridge.js';

// Automatically retries on 429/5xx, fast fails on 401/403
const data = await rttSearch('CAMBDGE', 'KNGX', '2025/11/29');
```

## Dependencies

- **zod**: ^3.24.1 - Runtime schema validation

## Migration Notes

- No breaking changes
- Existing code continues to work
- Configuration validation is opt-in (still gracefully handles missing optional fields)
- Retry logic is backward compatible with existing tests

## Future Improvements

Consider these enhancements:

1. **Circuit Breaker**: Stop retrying after consecutive failures
2. **Custom Retry Config**: Allow per-call retry configuration
3. **Metrics**: Track retry rates and success/failure ratios
4. **Validation Strictness**: Add strict mode for production
