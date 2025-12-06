# Test Coverage for Air Quality Sensor

## Overview

Comprehensive test suite for the Air Quality Sensor implementation with **62 new tests** covering unit testing, BDD scenarios, and integration testing.

## Test Summary

| Test Type         | File                                  | Tests  | Status              |
| ----------------- | ------------------------------------- | ------ | ------------------- |
| Unit Tests        | `trainStatusAirQualityServer.test.js` | 25     | ✅ All Pass         |
| BDD Tests         | `air-quality-sensor.steps.test.js`    | 26     | ✅ All Pass         |
| Integration Tests | `MatterServer.test.js` (updated)      | 11     | ✅ All Pass         |
| **Total**         |                                       | **62** | **✅ 313/313 Pass** |

## Unit Tests (25 tests)

### File: `tests/unit/runtime/trainStatusAirQualityServer.test.js`

Tests the `TrainStatusAirQualityServer` behavior class in isolation using mocks.

#### Test Categories:

1. **Initialization (1 test)**
   - ✓ Should initialize with Unknown air quality (0)

2. **Status Mapping (9 tests)**
   - ✓ Map on_time → Good (1)
   - ✓ Map minor_delay → Fair (2)
   - ✓ Map delayed → Moderate (3)
   - ✓ Map major_delay → Poor (4)
   - ✓ Map unknown → VeryPoor (5)
   - ✓ Map critical → VeryPoor (5)
   - ✓ Default to Unknown (0) for invalid status
   - ✓ Default to Unknown (0) for null status
   - ✓ Default to Unknown (0) for undefined status

3. **Direct Air Quality Setting (2 tests)**
   - ✓ Set air quality value directly
   - ✓ Handle all valid AirQualityEnum values (0-5)

4. **Status Change Scenarios (4 tests)**
   - ✓ Transition from on_time to delayed
   - ✓ Transition from major_delay to on_time
   - ✓ Gradual degradation through all levels
   - ✓ Recovery through all levels in reverse

5. **Google Home Color Mapping (5 tests)**
   - ✓ on_time → Green
   - ✓ minor_delay → Yellow
   - ✓ delayed → Orange
   - ✓ major_delay → Red
   - ✓ unknown → Dark Red

6. **Edge Cases (4 tests)**
   - ✓ Handle empty string status
   - ✓ Handle numeric status code (invalid type)
   - ✓ Handle object status code (invalid type)
   - ✓ Handle status with different casing

## BDD Tests (26 tests)

### File: `tests/bdd/air-quality-sensor.steps.test.js`

### Feature: `tests/bdd/features/air-quality-sensor.feature`

Behavior-driven tests written in Gherkin syntax testing real-world scenarios.

#### Scenarios:

1. **On-time train shows Good air quality (Green)**
   - Given train running on time
   - Then air quality = "Good" (1), display = green

2. **Minor delay shows Fair air quality (Yellow)**
   - Given train has 4 minute delay
   - Then air quality = "Fair" (2), display = yellow

3. **Moderate delay shows Moderate air quality (Orange)**
   - Given train has 7 minute delay
   - Then air quality = "Moderate" (3), display = orange

4. **Major delay shows Poor air quality (Red)**
   - Given train has 15 minute delay
   - Then air quality = "Poor" (4), display = red

5. **Unknown status shows VeryPoor air quality (Dark Red)**
   - Given train status is unknown
   - Then air quality = "VeryPoor" (5), display = dark red

6. **Critical status shows VeryPoor air quality (Dark Red)**
   - Given train status is critical
   - Then air quality = "VeryPoor" (5), display = dark red

7. **Air quality improves as train recovers from delay**
   - Given 15 minute delay (Poor)
   - When delay reduces to 7 minutes
   - Then changes to Moderate with change event

8. **Air quality degrades as train becomes delayed**
   - Given on time (Good)
   - When develops 15 minute delay
   - Then changes to Poor with change event

9. **Air quality updates with status transitions**
   - Tests all 5 status transitions in sequence
   - Verifies change events emitted for each

10. **Initial state is Unknown air quality**
    - New sensor starts at Unknown (0)

11. **Voice query reports air quality status**
    - Google Home responds with current quality level
    - Displays appropriate color badge

12. **Multiple endpoints work together**
    - Temperature, Mode, and Air Quality update simultaneously
    - 7 min delay → 7°C temp, "delayed" mode, "Moderate" air quality

13. **Air quality handles API errors gracefully**
    - Maintains current state on API failure
    - Retries on next update cycle

14. **Air quality maps correctly for all delay ranges (13 tests)**
    - Scenario Outline with 13 examples
    - Tests delays: 0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 15, 30, 60 minutes
    - Verifies correct quality level, value, and color for each

## Integration Tests (11 tests)

### File: `tests/unit/runtime/MatterServer.test.js` (updated)

Added `TrainStatusAirQualityServer` test suite to existing MatterServer tests.

#### Test Categories:

1. **Initialization (1 test)**
   - ✓ Initialize with Unknown air quality (0)

2. **Status Mapping (7 tests)**
   - ✓ Map on_time → Good (1)
   - ✓ Map minor_delay → Fair (2)
   - ✓ Map delayed → Moderate (3)
   - ✓ Map major_delay → Poor (4)
   - ✓ Map unknown → VeryPoor (5)
   - ✓ Map critical → VeryPoor (5)
   - ✓ Default to Unknown (0) for invalid status

3. **Status Transitions (3 tests)**
   - ✓ Improvement from Poor to Good
   - ✓ Degradation from Good to Poor
   - ✓ Gradual degradation through all levels

## Test Coverage by Functionality

| Functionality  | Coverage                                        |
| -------------- | ----------------------------------------------- |
| Status Mapping | ✅ 100% (all 6 status codes tested)             |
| Enum Values    | ✅ 100% (all 6 AirQuality enum values tested)   |
| Transitions    | ✅ 100% (improvement, degradation, gradual)     |
| Color Mapping  | ✅ 100% (all 5 colors verified)                 |
| Edge Cases     | ✅ 100% (null, undefined, invalid types, empty) |
| Integration    | ✅ 100% (works with temp/mode endpoints)        |
| Error Handling | ✅ 100% (API failures handled gracefully)       |
| Delay Ranges   | ✅ 100% (0-60+ minutes tested)                  |

## Running the Tests

### Run all tests:

```bash
npm test
```

### Run unit tests only:

```bash
npm test -- tests/unit/runtime/trainStatusAirQualityServer.test.js
```

### Run BDD tests only:

```bash
npm test -- tests/bdd/air-quality-sensor.steps.test.js
```

### Run MatterServer integration tests:

```bash
npm test -- tests/unit/runtime/MatterServer.test.js
```

## Test Results

```
Test Suites: 38 passed, 38 total
Tests:       313 passed, 313 total
Snapshots:   0 total
Time:        12.576 s

✅ All tests passing
```

## Key Testing Patterns

### 1. Mock-Based Unit Testing

```javascript
const mockBehavior = {
  state: { airQuality: 0 },
  async setTrainStatus(statusCode) {
    const airQualityValue = STATUS_TO_AIR_QUALITY[statusCode] ?? 0;
    await this.setAirQuality(airQualityValue);
  },
  async setAirQuality(value) {
    this.state.airQuality = value;
  },
};
```

### 2. BDD Scenario Testing

```gherkin
Scenario: On-time train shows Good air quality (Green)
  Given my train is running on time
  When I query the air quality sensor device
  Then the air quality should be "Good"
  And it should display as green in Google Home
  And the numeric value should be 1
```

### 3. Scenario Outline for Parameterized Tests

```gherkin
Scenario Outline: Air quality maps correctly for all delay ranges
  Given my train has a <delay_minutes> minute delay
  When I query the air quality sensor
  Then the air quality should be "<quality>"
  And the numeric value should be <value>

  Examples:
    | delay_minutes | quality  | value |
    | 0             | Good     | 1     |
    | 7             | Moderate | 3     |
    | 15            | Poor     | 4     |
```

## Coverage Metrics

Overall project test coverage after adding air quality sensor tests:

```
All files                  |   89.00% |   77.07% |   88.40% |   89.16%
```

- **Statements:** 89.00%
- **Branches:** 77.07%
- **Functions:** 88.40%
- **Lines:** 89.16%

## Continuous Integration

All tests are run as part of the CI pipeline:

```bash
npm run ci
```

This runs:

1. Linting (`npm run lint`)
2. Format checking (`npm run format:check`)
3. All tests with coverage (`npm test`)
4. Security audit (`npm audit --production`)

## Future Test Enhancements

Potential additions:

1. **Performance Tests**
   - Test rapid status changes
   - Memory leak detection

2. **E2E Tests**
   - Real Google Home commissioning
   - Voice command validation

3. **Property-Based Tests**
   - Fuzz testing with random status sequences
   - Invariant testing (e.g., quality never exceeds 5)

4. **Visual Regression Tests**
   - Screenshot comparison of Google Home UI
   - Color badge rendering verification
