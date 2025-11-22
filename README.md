# RTTChecker

A Matter smart home device that monitors real-time train status using the UK Rail Real-Time Trains (RTT) API. Exposes two Matter endpoints:
- A Mode Select device for status (On Time / Minor / Delayed / Major / Unknown)
- A Temperature Sensor that shows numeric delay in minutes (1:1 mapping)

## Overview
RTTChecker is a Matter device that queries the RTT API to select the best train for a given journey and reports its punctuality via two representations:
- Discrete status using the Matter Mode Select cluster
- Numeric delay (in minutes) using the Temperature Measurement cluster (temperature value equals minutes delayed; negative values mean early)

## Key Behaviour
- **Train Selection Logic:**
	- Given an origin and destination TIPLOC, a minimum offset (minutes after now), and a time window, RTTChecker selects the train that arrives at the destination earliest after the offset.
	- The train does not need to originate at the specified origin, but must pass through it (as a calling point or origin).
	- Only trains within the offset and window are considered.
	- If no suitable train is found, the service reports `UNKNOWN` status.

- **Status Reporting (Matter Mode Select):**
	- For the selected train, RTTChecker reports status as a Matter mode:
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
	- With a 20-minute offset and 60-minute window, RTTChecker selects the 06:39 train, as it arrives at KNGX at 07:32 (earliest after offset).
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
- Node.js 16+ installed
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
export LOG_LEVEL="debug"          # Set to "debug" for verbose RTT request/response & candidate selection logs
```

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
- Comprehensive Jest tests cover:
	- Train selection logic with real API responses
	- Edge cases (no train, cancelled, late)
	- Matter device behavior and status mapping
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
- `src/MatterDevice.js`: Matter device implementation
- `src/RTTBridge.js`: Core train selection logic
- `src/config.js`: Configuration management
- `src/constants.js`: Matter modes and train status constants
- `src/TrainStatusAirQualityDevice.js`: Temperature Sensor endpoint (1:1 delay→temp)
- `src/TrainStatusModeDevice.js`: Mode Select endpoint
- `tests/`: Jest tests and real API response examples
- `index.js`: Device startup and lifecycle management
- `Dockerfile`: Containerization for deployment

## Deployment
The device can be deployed using Docker for always-on operation. The Dockerfile is configured for containerized deployment on any platform supporting Docker (local server, VM, etc.). For network discovery to work, the container must be run with `--network host` to enable mDNS/Matter commissioning.

## Behaviour Summary
- **Clarity:** The device always selects the train that arrives at the destination earliest after the offset, regardless of origin, as long as it passes through the specified origin.
- **Reliability:** Status is calculated from real-time and scheduled data, with robust handling of edge cases.
- **Integration:** Full Matter protocol support for seamless integration with any Matter controller.

---
For more details, see the integration tests and API documentation in the codebase.
