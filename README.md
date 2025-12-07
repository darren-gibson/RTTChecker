# Train Status Matter Device

Real-time UK train punctuality exposed as a Matter device (Mode Select + Temperature Sensor) using the Real-Time Trains (RTT) API.

**Built with:** Node.js 23, matter.js v0.15.6, Pino logging

## 1. Overview

This service picks the next best train for a configured origin  destination journey and surfaces:

- Discrete status (Mode Select cluster) mapping five punctuality bands
- Numeric delay in minutes (Temperature Measurement cluster; negative = early)
- Optional color-coded status via an Air Quality Sensor endpoint (for richer Google Home visuals)

## 2. Core Features

- Smart train selection within a time offset + window (arrival-based ranking)
- Minute-by-minute automatic refresh (interval configurable)
- Robust retry & error classification (auth, transient API, network)
- Matter-compatible with major smart home ecosystems
- Clear utility functions for time parsing and date formatting

## 3. Status Modes

| Mode | Name        | Criteria                       |
| ---- | ----------- | ------------------------------ |
| 0    | On Time     | ≤ 2 min late / early / on time |
| 1    | Minor Delay | 3–5 min late                   |
| 2    | Delayed     | 6–10 min late                  |
| 3    | Major Delay | >10 min late or cancelled      |
| 4    | Unknown     | No suitable train found        |

Numeric delay sensor: value = minutes late (negative = early). Extreme/unknown conditions map to sentinel values internally (see domain logic).

## 4. Quick Start

```bash
git clone <repo>
cd RTTChecker
npm install
export RTT_USER=your_rtt_username RTT_PASS=your_rtt_password
export ORIGIN_TIPLOC=CAMBDGE DEST_TIPLOC=KNGX MIN_AFTER_MINUTES=20 WINDOW_MINUTES=60
npm start
```

Pair via QR code shown at startup (Google Home / Apple Home / etc.).

## 5. Configuration (Environment Variables)

| Variable                 | Description                                                   | Example                   |
| ------------------------ | ------------------------------------------------------------- | ------------------------- |
| RTT_USER / RTT_PASS      | RTT API credentials                                           | demo / secret             |
| ORIGIN_TIPLOC            | Origin TIPLOC (must be a calling point)                       | CAMBDGE                   |
| DEST_TIPLOC              | Destination TIPLOC                                            | KNGX                      |
| MIN_AFTER_MINUTES        | Minimum minutes from now before considering trains            | 20                        |
| WINDOW_MINUTES           | Size of search window (minutes)                               | 60                        |
| UPDATE_INTERVAL_MS       | Polling interval                                              | 60000                     |
| USE_BRIDGE               | `true` = bridge device; `false` = expose endpoints directly   | true                      |
| PRIMARY_ENDPOINT         | When not bridged, which device to expose: `mode`/`airQuality` | mode                      |
| STATUS_DEVICE_NAME       | Override Mode Select endpoint name                            | CAMBDGE-KNGX Train Status |
| DELAY_DEVICE_NAME        | Override delay sensor name                                    | CAMBDGE-KNGX Train Delay  |
| AIR_QUALITY_DEVICE_NAME  | Override air quality endpoint name                            | CAMBDGE-KNGX Air Quality  |
| LOG_LEVEL                | Global log level: error, warn, info, debug                    | info                      |
| MATTER_LOG_FORMAT        | Log format for matter.js: ansi, plain, html                   | ansi                      |
| DISCRIMINATOR / PASSCODE | Matter commissioning values                                   | 3840 / 20202021           |

## 6. Train Selection Logic

Inputs: origin TIPLOC, destination TIPLOC, min offset, window.
Process:

1. Fetch candidate services from RTT.
2. Filter to services that call at origin and reach destination.
3. Reject departures before offset or outside window.
4. Rank by earliest arrival after offset (tie-break by departure).
5. Derive status & delay from real-time vs scheduled times.

If no candidate survives filtering → status Unknown (mode 4).

## 7. Logging

Configure via `LOG_LEVEL` / `MATTER_LOG_FORMAT`. Core facilities: `rtt-checker`, `matter-server`, `rtt-bridge`. Global level acts as minimum floor. See [docs/LOGGING.md](docs/LOGGING.md) for patterns and examples.

## 8. Development & Testing

```bash
npm test            # Full Jest suite
npm run coverage    # (if defined) open coverage report
```

Coverage includes selection logic, error handling, retry backoff jitter, and utility edge cases.

## 10. Deployment

Run natively for quickest iteration:

```bash
npm install
LOG_LEVEL=info node index.js
```

Container (Linux host networking for mDNS/Matter) & multi‑arch build instructions are in [docs/CONTAINER_BUILD.md](docs/CONTAINER_BUILD.md).

## 11. Troubleshooting (Quick)

| Issue            | Action                                      |
| ---------------- | ------------------------------------------- |
| Not discoverable | Same network + host networking (Linux)      |
| No mDNS          | Open UDP 5353 & 5540; avoid VPN             |
| Auth failures    | Recheck `RTT_USER` / `RTT_PASS`             |
| Frequent Unknown | Adjust offset/window; verify route runs now |

See [docs/GOOGLE_HOME_SETUP.md](docs/GOOGLE_HOME_SETUP.md) for commissioning details.

## 12. Repository Structure (Condensed)

```
src/            core code (api/, services/, domain/, devices/, utils/)
tests/          unit + integration Jest suites
docker/         Dockerfile + compose overrides
scripts/        helper scripts (build, diagnose, reset)
docs/           supplemental guides
matter-storage/ persistent commissioning data
```

## 13. Architectural Highlights

- Layered separation (API → services → domain → devices)
- Explicit typed errors with retry classification
- Exponential backoff with jitter for resilient RTT requests
- Facility-based logging for targeted diagnostics
- Pure domain calculation isolated from I/O

## 14. Contributions

Open to small PRs improving selection heuristics, logging clarity, or test coverage. Propose changes via issue first.

---

For deeper insights, inspect tests and source modules in `src/`.

## Supplementary Guides

See [docs/GOOGLE_HOME_SETUP.md](docs/GOOGLE_HOME_SETUP.md) (commissioning & naming), [docs/GOOGLE_HOME_VOICE_COMMANDS.md](docs/GOOGLE_HOME_VOICE_COMMANDS.md) (voice usage), [docs/VALIDATION_AND_RETRY.md](docs/VALIDATION_AND_RETRY.md) (config schema & retry design), and [docs/CONTAINER_BUILD.md](docs/CONTAINER_BUILD.md) (multi-arch build).

### Device Types

Mode Select endpoint:

- **Type:** Mode Select Device (Matter Device Type 39)
- **Cluster:** Mode Select (0x0050)

Temperature Sensor endpoint:

- **Type:** Temperature Sensor (Matter Device Type 770)
- **Cluster:** Temperature Measurement (0x0402)
- **Units:** Hundredths of degrees Celsius (0.01°C) where 1.00°C = 1 minute delay
- **Range:** -10.00°C to 50.00°C (maps to -10 to +50 minutes)

### Supported Modes (Mode Select)

The device implements a Mode Select cluster with five modes representing train status:

1. **On Time** (mode 0) - Train running on schedule (≤2 min late)
2. **Minor Delay** (mode 1) - Slightly delayed (3-5 min late)
3. **Delayed** (mode 2) - Moderate delay (6-10 min late)
4. **Major Delay** (mode 3) - Significant delay (>10 min late) or cancelled
5. **Unknown** (mode 4) - No suitable train found

The mode automatically updates every minute based on real-time RTT API data.

### Delay-to-Temperature Mapping (Temperature Sensor)

- 0 minutes late → 0°C (on time)
- 5 minutes late → 5°C
- 20 minutes late → 20°C
- -3 minutes (early) → -3°C
- Unknown/No data → 99°C (indicates error or no train found)
- Values are capped to -10°C (very early) and 50°C (very late), except Unknown state

This mapping makes Google Home voice queries like "What's the temperature of Train Delay Sensor?" directly tell you the minutes delayed. A reading of 99°C indicates an error state or that no suitable train was found.

### Automation Examples

Use the mode state in Matter automations:

- **"If train status is Major Delay, send notification"**
- **"If train status is On Time, turn on lights green"**
- **"If train status is Unknown, send alert"**

## Project Structure

### Core Application

- `index.js`: Device startup and lifecycle management
- `src/config.js`: Configuration management with validation
- `src/constants.js`: Matter modes, train status constants, and timing thresholds

### Train Logic

- `src/api/rttApiClient.js`: RTT API client with exponential backoff retry logic
- `src/services/trainStatusService.js`: Train status orchestration and business logic
- `src/services/trainSelectionService.js`: Train selection and filtering algorithm
- `src/domain/trainStatus.js`: Pure domain logic for status calculation
- `src/utils/timeUtils.js`: Time parsing, normalization, and window utilities

### Matter Device Implementation

- `src/runtime/MatterServer.js`: Matter server (v0.15) with ServerNode API, custom temperature and mode select behaviors
- `src/devices/TrainStatusDevice.js`: TrainStatusDevice class with periodic updates and event emission

### Infrastructure

- `src/utils/logger.js`: Unified logging with Pino (facility-based organization: rtt-checker, matter-server, rtt-bridge)
- `src/errors.js`: Custom error classes for structured error handling
- `src/types.js`: JSDoc type definitions for IDE support

### Testing & Deployment

- `tests/`: Comprehensive Jest test suite
- `docker/`: Container assets (Dockerfile, docker-compose, entrypoint)
- `scripts/`: Build and utility scripts
- `docs/`: Additional documentation and guides (includes `LOGGING.md`)

### Architecture Highlights

- **Layered Architecture**: Clear separation between API, services, domain logic, and infrastructure
- **Type Safety**: JSDoc annotations for IDE autocomplete and documentation
- **Error Handling**: Typed errors with context (RTTApiError, ConfigurationError, etc.)
- **Unified Logging**: matter.js Logger with facility-based organization (see [docs/LOGGING.md](docs/LOGGING.md))
- **Domain-Driven Design**: Pure business logic isolated in domain layer
- **Event-Driven**: Normalized event payloads for status changes
- **Validated Config**: Fail-fast startup with descriptive error messages
- **Resilient API Client**: Exponential backoff retry with jitter for transient failures

<!-- Container deployment details trimmed; see docs/CONTAINER_BUILD.md -->

### Monitoring

```bash
# View logs
podman logs -f train-status

# Check status
podman ps | grep train-status

# Restart if needed
podman restart train-status

# Check Avahi status inside container
podman exec train-status pgrep avahi-daemon
```

## Behaviour Summary

- **Clarity:** The device always selects the train that arrives at the destination earliest after the offset, regardless of origin, as long as it passes through the specified origin.
- **Reliability:** Status is calculated from real-time and scheduled data, with robust handling of edge cases and structured error recovery.
- **Integration:** Full Matter protocol support for seamless integration with any Matter controller.
- **Observability:** Comprehensive logging and error tracking with actionable diagnostics for troubleshooting.

## Repository Structure

The repository is organized for clear separation of concerns:

```
.
├── src/                      # Application source code
│   ├── api/                  # External API clients
│   │   └── rttApiClient.js   # RTT API with retry logic
│   ├── services/             # Business logic orchestration
│   │   ├── trainStatusService.js
│   │   └── trainSelectionService.js
│   ├── domain/               # Pure domain logic
│   │   └── trainStatus.js    # Status calculation
│   ├── devices/              # Matter device implementations
│   │   ├── TrainStatusDevice.js
│   │   ├── TrainStatusTemperatureSensor.js
│   │   └── TrainStatusModeDevice.js
│   ├── runtime/              # Server orchestration
│   │   └── MatterServer.js
│   ├── utils/                # Utilities
│   │   ├── logger.js
│   │   └── timeUtils.js
│   ├── config.js             # Configuration & validation
│   ├── constants.js          # Application constants
│   ├── errors.js             # Custom error classes
│   └── types.js              # JSDoc type definitions
├── tests/                    # Jest test suite (143 tests)
│   ├── integration/          # End-to-end scenarios
│   ├── unit/                 # Unit tests
│   │   ├── api/              # API client tests
│   │   ├── domain/           # Domain logic tests
│   │   ├── devices/          # Device tests
│   │   └── utils/            # Utility tests
│   └── ...
├── docker/                   # Container deployment assets
│   ├── Dockerfile            # Multi-arch container definition
│   ├── docker-compose.yml    # Base compose configuration
│   ├── docker-compose.dev.yml   # ARM64/local override
│   ├── docker-compose.prod.yml  # AMD64/production override
│   └── docker-entrypoint.sh  # Container startup script
├── scripts/                  # Operational utilities
│   ├── build-container.sh    # Multi-arch build automation
│   ├── reset-commissioning.sh # Reset Matter pairing
│   └── diagnose.sh           # System diagnostics
├── docs/                     # Additional documentation
│   ├── CONTAINER_BUILD.md    # Multi-arch build guide
│   ├── GOOGLE_HOME_SETUP.md  # Google Home integration
│   └── GOOGLE_HOME_VOICE_COMMANDS.md # Voice command guide
├── matter-storage/           # Persistent commissioning state
│   └── README.md             # Storage format documentation
├── coverage/                 # Jest coverage reports (generated)
├── index.js                  # Application entry point
├── package.json              # Dependencies & scripts
├── .env.example              # Environment variable template
└── README.md                 # This file
```

### Key Benefits of This Structure

- **Clear boundaries**: Source, tests, deployment, and docs are cleanly separated
- **Easy navigation**: Related files grouped by function (docker/, scripts/, docs/)
- **Discoverable**: Each directory contains only its relevant files
- **Scalable**: Additional scripts, docs, or deployment configs go in appropriate directories

---

For more details, see the integration tests and API documentation in the codebase.
