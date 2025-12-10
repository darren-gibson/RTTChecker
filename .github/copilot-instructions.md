# GitHub Copilot Instructions for RTTChecker

## Project Context

RTTChecker is a Matter.js-based smart home device that monitors UK train delays and exposes them through a Matter air quality sensor. The device integrates with Google Home, Apple HomeKit, and other Matter-compatible ecosystems.

## Quality Standards - ALWAYS FOLLOW

**Before marking any work as complete, you MUST:**

1. **Run and pass all quality checks**:

   ```bash
   npm run lint          # Must pass with no errors
   npm run format        # Must be executed
   npm test             # All 533+ tests must pass
   ```

2. **Follow the Definition of Done**: See [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) for complete checklist

3. **Test new functionality**: Add appropriate unit tests, integration tests, or BDD scenarios

4. **Maintain code patterns**: Follow existing architectural patterns in the codebase

## Code Organization

```
src/
├── api/              # External API clients (RTT API)
├── devices/          # TrainStatusDevice and business logic
├── domain/           # Pure domain logic (mapping, status calculation)
├── runtime/          # Matter.js integration (server, behaviors, endpoints)
├── services/         # Business services (train selection, status)
└── utils/            # Shared utilities (logger, validation, retry logic)

tests/
├── bdd/              # Cucumber BDD tests for business logic
├── unit/             # Unit tests organized by source structure
├── integration/      # Integration tests for external systems
└── fixtures/         # Test data and helpers
```

## Critical Patterns to Respect

### 1. Event Timing & Race Conditions

```typescript
// ✅ CORRECT: Initialize Matter server BEFORE starting updates
await startMatterServer(device);
device.startPeriodicUpdates();

// ❌ WRONG: Updates fire before listeners attached
device.startPeriodicUpdates();
await startMatterServer(device);
```

### 2. Error Handling

```typescript
// ✅ Use typed errors
import { RTTAPIError, TrainSelectionError } from './errors.js';

throw new TrainSelectionError('No suitable trains found', {
  cause: originalError,
  details: { tiploc, window },
});
```

### 3. Logging

```typescript
// ✅ Use structured logging
logger.info('Train selected', {
  trainUid,
  scheduledDeparture,
  delay: delayMinutes,
});

// ❌ Avoid console.log in production code
console.log('Train selected:', trainUid);
```

### 4. TypeScript

```typescript
// ✅ Explicit types
interface TrainStatus {
  mode: string;
  delayMinutes: number;
  airQuality: AirQualityEnum;
}

// ❌ Avoid any
function process(data: any) { ... }
```

### 5. Async Operations

```typescript
// ✅ Proper cleanup
const timer = setInterval(() => { ... }, interval);
// Later:
clearInterval(timer);

// ✅ Proper event listener cleanup
const handler = (data) => { ... };
emitter.on('event', handler);
// Later:
emitter.off('event', handler);
```

## Testing Requirements

### BDD Tests (Cucumber)

Use for business logic and user-facing features:

```gherkin
Feature: Train Status Mapping
  Scenario: Train running on time
    Given a train with 0 minutes delay
    When I check the air quality
    Then it should be "Good (Green)"
```

### Unit Tests (Jest)

Use for isolated logic testing:

```typescript
describe('deriveModeFromDelay', () => {
  it('should return On Time for 0 minute delay', () => {
    expect(deriveModeFromDelay(0)).toBe('On Time');
  });
});
```

### Integration Tests

Use for external system interactions:

```typescript
describe('MatterServer', () => {
  it('should initialize and attach event listeners before updates', async () => {
    // Test real integration flow
  });
});
```

## Import Order Convention

```typescript
// 1. External packages (alphabetical)
import { EventEmitter } from 'events';
import { defineFeature, loadFeature } from 'jest-cucumber';

// 2. Blank line

// 3. Internal imports (alphabetical by path)
import { rttSearch } from '../../src/api/rttApiClient.js';
import { TrainStatusDevice } from '../../src/devices/TrainStatusDevice.js';
import { STATUS_TO_AIR_QUALITY } from '../../src/domain/airQualityMapping.js';
```

## Commit Message Format

```
<action> <component>: <brief description>

- Detailed point 1
- Detailed point 2
- Quality check status (tests, linting, formatting)

Example:
Add BDD tests for Matter server startup initialization

- Implement 7 Cucumber scenarios covering initialization sequence
- Test event listener timing and first status update capture
- All 533 tests passing, linting and formatting verified
```

## Common Commands

```bash
# Development
npm start                    # Start the device
npm test                     # Run all tests
npm run test:bdd            # Run BDD tests only
npm run lint                # Check linting
npm run format              # Auto-format code
npm run format:check        # Verify formatting
npm run ci                  # Run all quality checks

# Build & Type Check
npm run build               # Compile TypeScript

# Diagnostics
npm run diagnose            # Check system configuration
npm run reset               # Reset Matter commissioning state
```

## When Suggesting Changes

1. **Understand context**: Read related files before suggesting changes
2. **Follow patterns**: Match existing code style and architecture
3. **Test thoroughly**: Include test cases with production code
4. **Document decisions**: Add comments for non-obvious logic
5. **Consider edge cases**: Null, undefined, empty arrays, zero values
6. **Clean up**: Remove debug code, unused imports, commented code

## Red Flags - Avoid These

- ❌ Using `console.log` instead of `logger`
- ❌ Catching errors without proper handling
- ❌ Adding dependencies without justification
- ❌ Skipping tests for new functionality
- ❌ Hardcoding values that should be configurable
- ❌ Creating race conditions with async code
- ❌ Memory leaks from unremoved event listeners
- ❌ Using `any` type without strong justification

## Matter.js Specific Guidelines

### Device Initialization

```typescript
// Always initialize in this order:
1. Create ServerNode
2. Add aggregator (bridge) endpoint
3. Create and add device endpoints
4. Attach event listeners to device
5. Start periodic updates
6. Run server (non-blocking with .run())
```

### Cluster Behaviors

```typescript
// Use Matter.js typed behavior extensions
import { AirQualitySensorServer } from '@matter/main/behaviors';

class TrainStatusAirQualityServer extends AirQualitySensorServer {
  override initialize() {
    // Custom initialization
  }
}
```

### Event Propagation

```typescript
// Device emits events → Behaviors update cluster state
device.on('statusChange', (status) => {
  this.state.airQuality = status.airQuality;
});
```

## Resources

- [Definition of Done](./DEFINITION_OF_DONE.md)
- [README.md](../README.md)
- [BDD Testing Guide](../tests/bdd/README.md)
- [Matter.js Documentation](https://github.com/matter-js/matter.js)
- [RTT API Documentation](https://www.realtimetrains.co.uk/about/developer/pull/docs/locationlist/)

---

**Remember**: Quality is not optional. Every change must meet the standards in DEFINITION_OF_DONE.md before being considered complete.
