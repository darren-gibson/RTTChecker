# Validation & Retry

Two runtime safeguards:
1. Zod configuration schema (`validateConfig()`)
2. Exponential backoff with jitter for RTT API (`rttSearch()`)

## Config Schema (Zod)
Required: `RTT_USER`, `RTT_PASS` (non-empty).
Validated (ranges/formats): TIPLOCs (3–8 A-Z0-9), `MIN_AFTER_MINUTES` (0–1440), `WINDOW_MINUTES` (1–1440), `PORT` (1–65535), `DISCRIMINATOR` (0–4095), `PASSCODE` (1–99999999), `LOG_LEVEL` (debug|info|warn|error), `MATTER_LOG_FORMAT` (ansi|plain|html), device names ≤64 chars.

Benefits: early failure, clear messages, runtime type safety.
Example failure:
```
❌ Configuration validation failed:
 • PORT: Too big (<=65535)
 • ORIGIN_TIPLOC: must be 3-8 uppercase alphanumeric
```

Usage:
```js
import { validateConfig } from './src/config.js';
validateConfig(); // throws on invalid
```

## Retry Strategy
Retryable: 429, 500, 502, 503, 504, network errors.
Fast‑fail: 400, 401, 403, 404.
Config:
```js
{ maxRetries:3, baseDelayMs:1000, maxDelayMs:10000,
  retryableStatusCodes:[429,500,502,503,504],
  nonRetryableStatusCodes:[400,401,403,404] }
```
Backoff: delay = base * 2^attempt + jitter (≤30%), capped.
Sequence (~): 1s → 2s → 4s (with ±30%).

Benefits: resilience, respectful rate limiting, rapid auth failure, logged attempts.

Usage:
```js
import { rttSearch } from './src/api/rttApiClient.js';
const data = await rttSearch('CAMBDGE','KNGX','2025/11/29');
```

## Testing
Covered: valid/invalid config bounds, retry vs fast-fail paths, jitter bounds.

## Future Ideas
Circuit breaker, per-call overrides, metrics export, strict prod mode.
