# Train Status Matter Device

A Matter smart home device that monitors real-time train status using the UK Rail Real-Time Trains (RTT) API. Exposes two Matter endpoints:
- A Mode Select device for status (On Time / Minor / Delayed / Major / Unknown)
- A Temperature Sensor that shows numeric delay in minutes (1:1 mapping)

## Overview
Train Status is a Matter device that queries the RTT API to select the best train for a given journey and reports its punctuality via two representations:
- Discrete status using the Matter Mode Select cluster
- Numeric delay (in minutes) using the Temperature Measurement cluster (temperature value equals minutes delayed; negative values mean early)

## Key Behaviour
- **Train Selection Logic:**
	- Given an origin and destination TIPLOC, a minimum offset (minutes after now), and a time window, the service selects the train that arrives at the destination earliest after the offset.
	- The train does not need to originate at the specified origin, but must pass through it (as a calling point or origin).
	- Only trains within the offset and window are considered.
	- If no suitable train is found, the service reports `UNKNOWN` status.

- **Status Reporting (Matter Mode Select):**
	- For the selected train, the service reports status as a Matter mode:
		- **On Time** (mode 0): On time or ≤2 minutes late
		- **Minor Delay** (mode 1): 3–5 minutes late
		- **Delayed** (mode 2): 6–10 minutes late
		- **Major Delay** (mode 3): >10 minutes late or cancelled
		- **Unknown** (mode 4): No suitable train found

- **Matter Integration:**
	- Implements Mode Select cluster for status
	- Implements Temperature Measurement cluster for numeric delay (1:1 minutes ↔ °C)
	- Compatible with Apple Home, Google Home, Amazon Alexa
	- Updates automatically every minute (configurable)

## Example Scenario
- At 06:05 BST, 20/Oct/2025, for Cambridge (CAMBDGE) to London Kings Cross (KNGX):
	- With a 20-minute offset and 60-minute window, the service selects the 06:39 train, as it arrives at KNGX at 07:32 (earliest after offset).
	- The device displays mode "On Time" if the train is running on schedule.

## Matter Device Setup

### Device Types
This device exposes two endpoints:

1) **Matter Mode Select** device type, representing the 5 discrete train status states:
- **On Time** (mode 0): Train on schedule (≤2 min late)
- **Minor Delay** (mode 1): Slightly delayed (3-5 min late)
- **Delayed** (mode 2): Moderate delay (6-10 min late)
- **Major Delay** (mode 3): Significant delay (>10 min late) or cancelled
- **Unknown** (mode 4): No suitable train found

2) **Matter Temperature Sensor** device type, representing the numeric delay with a simple, voice-friendly mapping:
- Temperature value equals the number of minutes delayed (°C = minutes)
- Negative values indicate early arrivals (e.g., -3°C = 3 minutes early)
- Values are capped to a safe range: -10°C (very early) to 50°C (very late)

### Prerequisites
- Matter controller (Apple HomePod, Google Nest Hub, etc.)
- Node.js 24.x LTS for local development (matches Docker image)
   - With Homebrew (macOS):
      - `brew install node@24` (or `brew install node` if 24 is default)
      - `brew unlink node && brew link --overwrite --force node@24`
      - `node -v` should report v24.x
   - With nvm (optional):
      - `nvm use` (uses `.nvmrc`)
      - or `nvm install 24 && nvm use 24`
- RTT API credentials

### Installation
```bash
npm install
```

### Configuration
Set environment variables:
```bash
# RTT API credentials (required)
export RTT_USER="your_rtt_username"
export RTT_PASS="your_rtt_password"

# Train search parameters
export ORIGIN_TIPLOC="CAMBDGE"  # Cambridge
export DEST_TIPLOC="KNGX"       # London Kings Cross
export MIN_AFTER_MINUTES=20     # Look for trains 20+ minutes from now
export WINDOW_MINUTES=60        # Within next 60 minutes

# Matter device settings
export DEVICE_NAME="Train Status"
export DISCRIMINATOR=3840       # For Matter commissioning
export PASSCODE=20202021        # For Matter commissioning
export UPDATE_INTERVAL_MS=60000 # Update every 60 seconds
export USE_BRIDGE="true"        # Default true, set to "false" to disable the Matter Bridge (Aggregator) and expose the two endpoints directly

# Optional per-endpoint custom names (defaults derive from ORIGIN_TIPLOC-DEST_TIPLOC)
export STATUS_DEVICE_NAME="CAMBDGE-KNGX Train Status"   # Mode Select endpoint name
export DELAY_DEVICE_NAME="CAMBDGE-KNGX Train Delay"     # Temperature Sensor endpoint name

# Logging (optional)
export LOG_LEVEL="debug"          # error < warn < info < debug (default: info)
```

### Logging and Debugging

The application uses **matter.js's built-in Logger** for consistent, facility-based logging across the entire project:

**Log Levels** (set via `LOG_LEVEL` environment variable):
- `error`: Critical failures only (config validation, API auth errors)
- `warn`: Warnings and retryable issues (API temporarily down, no train found)
- `info`: Normal operation (status changes, periodic updates) - **default**
- `debug`: Verbose details (API requests/responses, candidate train selection)

**Logging Facilities:**
The application organizes logs into facilities for granular control:
- `rtt-checker`: Main application lifecycle and device updates
- `matter-server`: Matter server initialization and commissioning
- `rtt-bridge`: RTT API interactions and train selection
- Plus all native matter.js facilities (e.g., `MatterServer`, `CommissioningServer`)

**Examples:**
```bash
# Production: errors and warnings only
export LOG_LEVEL="warn"

# Development: full debug output
export LOG_LEVEL="debug"

# Default: info level (status changes, updates)
export LOG_LEVEL="info"
```

**Log Format:**
By default, logs use ANSI formatting for colored, structured output showing timestamps, log levels, and facility names. You can customize this:
```bash
# Change format (ansi, plain, or html)
export MATTER_LOG_FORMAT="plain"  # Disable colors
export MATTER_LOG_FORMAT="ansi"   # Colored output (default)
```

**Error Context:**
The application provides structured error information:
- Authentication failures point to credentials
- Retryable errors (5xx) show retry indication
- Network errors include endpoint and context
- All errors are timestamped with relevant details via matter.js Logger

### Running the Device
```bash
npm start
```

### Commissioning with Google Home

1. **Start the Device:**
   ```bash
   npm start
   ```
   The terminal will display a QR code and manual pairing code

2. **Open Google Home App:**
   - Launch the Google Home app on your phone
   - Ensure your phone is on the same network

3. **Add Device:**
   - Tap the **+** button in the top left
   - Select **Add device** → **New device**
   - Choose your home
   - Wait for Google Home to scan for devices

4. **Commission Device:**
   - When prompted, scan the **QR code** shown in the terminal
   - OR tap "Set up without QR code" and enter the **manual pairing code**
   - Default passcode: `20202021`
   - Default discriminator: `3840`


5. **Verify:**
	- The app exposes a Bridge (Aggregator) with two bridged devices that will appear in Google Home:
	  - "CAMBDGE-KNGX Train Status" (or your override) – Mode Select with one of 5 modes
	  - "CAMBDGE-KNGX Train Delay" (or your override) – Temperature Sensor showing numeric delay
	- Temperature value equals minutes of delay (negative = early, zero = on time)
	- Values update automatically every minute
	- Devices are read-only (status comes from RTT updates)

### Testing
- Comprehensive Jest test suite with 105 tests covering:
	- Train selection logic with real API responses
	- Edge cases (no train, cancelled, late, midnight wrap)
	- Matter device behavior and status mapping
	- Event payload normalization
	- Configuration validation
	- Error handling and classification
	- Time utilities and parsing
- Test coverage: ~88% statement coverage
- To run tests:
	```bash
	npm test
	```

## Matter Device Details

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
- `src/runtime/MatterServer.js`: Matter commissioning server setup and endpoint creation
- `src/devices/TrainStatusDevice.js`: TrainStatusDevice class with periodic updates and event emission
- `src/devices/TrainStatusTemperatureSensor.js`: Temperature Sensor endpoint (1:1 delay→temp)
- `src/devices/TrainStatusModeDevice.js`: Mode Select endpoint

### Infrastructure
- `src/utils/logger.js`: matter.js Logger wrapper with facility-based logging (rtt-checker, matter-server, rtt-bridge)
- `src/errors.js`: Custom error classes for structured error handling
- `src/types.js`: JSDoc type definitions for IDE support

### Testing & Deployment
- `tests/`: Comprehensive Jest test suite (105 tests)
- `docker/`: Container assets (Dockerfile, docker-compose, entrypoint)
- `scripts/`: Build and utility scripts
- `docs/`: Additional documentation and guides (includes `LOGGING.md`)

### Architecture Highlights
- **Layered Architecture**: Clear separation between API, services, domain logic, and infrastructure
- **Type Safety**: JSDoc annotations for IDE autocomplete and documentation
- **Error Handling**: Typed errors with context (RTTApiError, ConfigurationError, etc.)
- **Unified Logging**: matter.js Logger with facility-based organization (see `docs/LOGGING.md`)
- **Domain-Driven Design**: Pure business logic isolated in domain layer
- **Event-Driven**: Normalized event payloads for status changes
- **Validated Config**: Fail-fast startup with descriptive error messages
- **Resilient API Client**: Exponential backoff retry with jitter for transient failures

## Container Deployment

### Multi-Architecture Builds

This project supports building for both local development (ARM64/Apple Silicon) and production deployment (AMD64/x86_64).

**Quick Start:**

```bash
# For local dev on Mac (ARM64)
./scripts/build-container.sh dev

# For production deployment (AMD64)
./scripts/build-container.sh prod

# Build both architectures
./scripts/build-container.sh multi
```

### Building the Container

**For local development (ARM64):**
```bash
podman-compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml build
# Creates: train-status:latest-arm64
```

**For production deployment (AMD64):**
```bash
podman-compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml build
# Creates: train-status:latest-amd64
```

**Manual build (specify architecture):**
```bash
# ARM64
podman build --platform linux/arm64 -t train-status:latest-arm64 .

# AMD64
podman build --platform linux/amd64 -t train-status:latest-amd64 .
```

### Running with Docker

```bash
docker run -d \
  --name train-status \
  --network host \
  --restart unless-stopped \
  -e RTT_USER=your_username \
  -e RTT_PASS=your_password \
  -e ORIGIN_TIPLOC=CAMBDGE \
  -e DEST_TIPLOC=KNGX \
  -e USE_BRIDGE=true \
  -v $(pwd)/.matter-storage:/app/.matter-storage \
  train-status
```

### Running with Podman

**⚠️ Important: macOS Limitation**

Podman on macOS runs containers inside a virtual machine, which means `--network host` does **NOT** give access to your Mac's actual network. mDNS/Matter discovery will **NOT work** in Podman containers on macOS.

**Solutions:**
1. **Recommended**: Run the application directly on macOS without containerization:
   ```bash
   npm install
   export RTT_USER=your_username RTT_PASS=your_password
   node index.js
   ```

2. Use Docker Desktop instead of Podman (Docker Desktop has better macOS network integration)

3. Deploy the container on a Linux host where `--network host` works as expected

**For Linux hosts**, run the appropriate architecture:

```bash
# Run AMD64 image on Linux server
podman run -d \
  --name train-status \
  --network host \
  --restart unless-stopped \
  --cap-add=NET_ADMIN \
  --cap-add=NET_RAW \
  -e RTT_USER=your_username \
  -e RTT_PASS=your_password \
  -e ORIGIN_TIPLOC=CAMBDGE \
  -e DEST_TIPLOC=KNGX \
  -e USE_BRIDGE=true \
  -v $(pwd)/matter-storage:/app/.matter-storage:Z \
  train-status:latest-amd64
```

**Transferring to Production Server:**

```bash
# Export on Mac
podman save train-status:latest-amd64 | gzip > train-status-amd64.tar.gz

# Transfer to server (scp, rsync, etc.)
scp train-status-amd64.tar.gz user@server:/path/

# Load on server
podman load < train-status-amd64.tar.gz
```

**Important Podman Notes:**
- `--network host` is **required** for Matter/mDNS discovery
- `--cap-add=NET_ADMIN` and `--cap-add=NET_RAW` allow proper network access
- `:Z` suffix on volume mount sets correct SELinux context on RHEL/Fedora
- Matter.js handles mDNS directly (no Avahi needed)

### Troubleshooting Container Discovery

If the device isn't discovered by Google Home/Matter controllers:

1. **Check Avahi is running inside container:**
   ```bash
   podman exec train-status pgrep avahi-daemon
   ```

2. **Verify mDNS traffic (on host):**
   ```bash
   sudo tcpdump -i any udp port 5353
   ```

3. **Test from another machine on same network:**
   ```bash
   avahi-browse -a -t
   # Should show _matter._tcp and _matterc._udp services
   ```

4. **Check firewall (host machine):**
   ```bash
   # Allow UDP 5353 (mDNS) and 5540 (Matter)
   sudo firewall-cmd --permanent --add-port=5353/udp
   sudo firewall-cmd --permanent --add-port=5540/udp
   sudo firewall-cmd --reload
   ```

5. **SELinux troubleshooting (if using Podman on Fedora/RHEL):**
   ```bash
   # Check for denials
   sudo ausearch -m avc -ts recent
   
   # If Avahi is blocked, you may need:
   sudo setsebool -P container_connect_any 1
   ```

6. **Manual commissioning (fallback):**
   If discovery still fails, use the manual pairing code displayed in logs:
   ```bash
   podman logs train-status | grep -A5 "MANUAL PAIRING CODE"
   ```

### Docker Compose / Podman Compose (Recommended)

For easier management, use the provided docker-compose files:

**Local Development (ARM64/Mac):**
```bash
# 1. Copy example environment file
cp .env.example .env

# 2. Edit .env with your credentials
nano .env

# 3. Build and run for ARM64
podman-compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d

# View logs
podman-compose logs -f train-status
```

**Production Deployment (AMD64/Linux):**
```bash
# 1. Ensure .env is configured
cp .env.example .env
nano .env

# 2. Build and run for AMD64
podman-compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d

# View logs
podman-compose logs -f train-status

# Stop
podman-compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml down
podman-compose up -d

# View logs
docker-compose logs -f
# or
podman-compose logs -f

# Stop
docker-compose down
# or
podman-compose down
```

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
