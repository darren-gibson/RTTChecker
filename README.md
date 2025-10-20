# RTTChecker

A Node.js service for real-time train selection and status reporting, designed for integration with smart home platforms and automation systems.

## Overview
RTTChecker queries the UK Rail Real-Time Trains (RTT) API to select the best train for a given journey and reports its status (on time, late, cancelled, etc). The service is optimized for use cases like Google Home, home automation, and travel notifications.

## Key Behaviour
- **Train Selection Logic:**
	- Given an origin and destination TIPLOC, a minimum offset (minutes after now), and a time window, RTTChecker selects the train that arrives at the destination earliest after the offset.
	- The train does not need to originate at the specified origin, but must pass through it (as a calling point or origin).
	- Only trains within the offset and window are considered.
	- If no suitable train is found, the service reports `UNKNOWN` status.

- **Status Calculation:**
	- For the selected train, RTTChecker calculates the air quality state based on lateness:
		- `GOOD`: On time or ≤2 minutes late
		- `FAIR`: 3–5 minutes late
		- `POOR`: 6–10 minutes late
		- `VERY_POOR`: >10 minutes late or cancelled
		- `UNKNOWN`: No suitable train found

- **API Integration:**
	- Exposes an Express API endpoint (`/smarthome`) for Google Home Smart Home integration.
	- Returns device metadata and current train status in Google Home format.

## Example Scenario
- At 06:05 BST, 20/Oct/2025, for Cambridge (CAMBDGE) to London Kings Cross (KNGX):
	- With a 20-minute offset and 60-minute window, RTTChecker selects the 06:39 train, as it arrives at KNGX at 07:32 (earliest after offset).
	- The service reports the train's status (e.g., `GOOD` if on time).

## Testing
- Comprehensive Jest tests cover:
	- Train selection logic with real API responses
	- Edge cases (no train, cancelled, late)
	- API behaviour and integration
- To run tests:
	```bash
	npm test
	```

## Configuration
- Set environment variables for RTT API credentials and train search defaults:
	- `RTT_USER`, `RTT_PASS`: RTT API credentials
	- `ORIGIN_TIPLOC`, `DEST_TIPLOC`: TIPLOC codes
	- `MIN_AFTER_MINUTES`, `WINDOW_MINUTES`: Search window

## Usage
- Start the service:
	```bash
	npm start
	```
- Query the API endpoint for train status and metadata.

## Project Structure
- `src/RTTBridge.js`: Core business logic
- `src/config.js`: Configuration
- `src/constants.js`: Status constants
- `tests/`: Jest tests and real API response examples
- `Dockerfile`: Containerization for cloud deployment

## Behaviour Summary
- **Clarity:** The service always selects the train that arrives at the destination earliest after the offset, regardless of origin, as long as it passes through the specified origin.
- **Reliability:** Status is calculated from real-time and scheduled data, with robust handling of edge cases.
- **Integration:** Designed for smart home and automation platforms, with clear API responses and metadata.

---
For more details, see the integration tests and API documentation in the codebase.
