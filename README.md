# RTTChecker

A Matter smart home device that monitors real-time train status using the UK Rail Real-Time Trains (RTT) API. Displays train punctuality as a Mode Select device compatible with all Matter controllers.

## Overview
RTTChecker is a Matter device that queries the RTT API to select the best train for a given journey and reports its punctuality status using the Matter Mode Select cluster. The device appears in Matter-compatible apps (Apple Home, Google Home, Amazon Alexa) showing clear train status modes.

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
	- Implements Matter Mode Select cluster
	- Compatible with Apple Home, Google Home, Amazon Alexa
	- Updates status automatically every minute (configurable)

## Example Scenario
- At 06:05 BST, 20/Oct/2025, for Cambridge (CAMBDGE) to London Kings Cross (KNGX):
	- With a 20-minute offset and 60-minute window, RTTChecker selects the 06:39 train, as it arrives at KNGX at 07:32 (earliest after offset).
	- The device displays mode "On Time" if the train is running on schedule.

## Matter Device Setup

### Device Type
This device implements the **Matter Mode Select** device type, which properly represents the 5 discrete train status states:
- **On Time** (mode 0): Train on schedule (≤2 min late)
- **Minor Delay** (mode 1): Slightly delayed (3-5 min late)
- **Delayed** (mode 2): Moderate delay (6-10 min late)
- **Major Delay** (mode 3): Significant delay (>10 min late) or cancelled
- **Unknown** (mode 4): No suitable train found

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
   - The device will appear as "Train Status" in your Google Home
   - Current train status displays as one of 5 modes (On Time, Minor Delay, Delayed, Major Delay, Unknown)
   - Status updates automatically every minute
   - The device is read-only (you view status, but cannot manually change modes)

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

### Device Type
- **Type:** Mode Select Device (Matter Device Type 39)
- **Vendor ID:** 0xFFF1 (test vendor)
- **Product ID:** 0x8001
- **Cluster:** Mode Select (0x0050)

### Supported Modes
The device implements a Mode Select cluster with five modes representing train status:
1. **On Time** (mode 0) - Train running on schedule (≤2 min late)
2. **Minor Delay** (mode 1) - Slightly delayed (3-5 min late)
3. **Delayed** (mode 2) - Moderate delay (6-10 min late)
4. **Major Delay** (mode 3) - Significant delay (>10 min late) or cancelled
5. **Unknown** (mode 4) - No suitable train found

The mode automatically updates every minute based on real-time RTT API data.

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
- `tests/`: Jest tests and real API response examples
- `index.js`: Device startup and lifecycle management
- `Dockerfile`: Containerization for deployment

## Deployment
The device can be deployed to cloud environments (Google Cloud Run, AWS, etc.) for always-on operation. See `build/deploy.sh` for deployment scripts.

## Behaviour Summary
- **Clarity:** The device always selects the train that arrives at the destination earliest after the offset, regardless of origin, as long as it passes through the specified origin.
- **Reliability:** Status is calculated from real-time and scheduled data, with robust handling of edge cases.
- **Integration:** Full Matter protocol support for seamless integration with any Matter controller.

---
For more details, see the integration tests and API documentation in the codebase.
