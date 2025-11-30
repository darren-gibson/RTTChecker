# Behavior-Driven Development (BDD) Tests

This directory contains Gherkin-style BDD tests that document the behavior of the RTT Checker system in a human-readable format.

## Overview

BDD tests are written using [jest-cucumber](https://github.com/bencompton/jest-cucumber), which allows us to write tests in Gherkin syntax and execute them with Jest.

## Structure

```
tests/bdd/
├── features/              # Gherkin feature files (.feature)
│   ├── train-selection.feature
│   ├── train-status.feature
│   ├── matter-integration.feature
│   └── api-resilience.feature
├── train-selection.steps.js    # Step definitions for train selection
├── train-status.steps.js       # Step definitions for train status
└── README.md                    # This file
```

## Feature Files

### train-selection.feature

Documents how the system selects the most appropriate train from available services:

- Selecting earliest train within time window
- Excluding trains outside the window
- Prioritizing fastest trains
- Handling next-day departure rollover
- Dealing with no suitable trains

### train-status.feature

Documents how the system assesses train status and delays:

- Trains running on time
- Minor delays (1-5 minutes)
- Moderate delays (6-10 minutes)
- Major delays (over 10 minutes)
- Cancelled trains
- Unknown status scenarios

### matter-integration.feature

Documents how train status is exposed through Matter-compatible devices:

- Temperature sensor mapping to train status
- Mode device status representation
- Periodic updates and event emission
- Error handling and API resilience

### api-resilience.feature

Documents retry logic and error handling for the RTT API:

- Successful requests
- Transient error retry with exponential backoff
- Authentication error handling
- Maximum retry limits
- Retryable vs non-retryable status codes

## Running BDD Tests

Run all BDD tests:

```bash
npm test -- tests/bdd
```

Run a specific feature:

```bash
npm test -- tests/bdd/train-selection.steps.js
```

Run with verbose output:

```bash
npm test -- tests/bdd --verbose
```

## Writing New BDD Tests

1. **Create a feature file** in `features/` describing the behavior in Gherkin syntax:

```gherkin
Feature: My New Feature
  As a user
  I want some behavior
  So that I achieve some goal

  Scenario: Happy path
    Given some precondition
    When I perform an action
    Then I should see the expected result
```

2. **Create step definitions** in a `.steps.js` file:

```javascript
import { defineFeature, loadFeature } from 'jest-cucumber';

const feature = loadFeature('./tests/bdd/features/my-feature.feature');

defineFeature(feature, (test) => {
  test('Happy path', ({ given, when, then }) => {
    given('some precondition', () => {
      // Setup code
    });

    when('I perform an action', () => {
      // Action code
    });

    then('I should see the expected result', () => {
      // Assertions
    });
  });
});
```

## Benefits of BDD Tests

1. **Living Documentation**: Feature files serve as up-to-date documentation
2. **Shared Understanding**: Business stakeholders can read and validate behavior
3. **Clear Intent**: Each test explicitly states the goal and context
4. **Traceability**: Easy to map requirements to tests
5. **Regression Prevention**: Behavior is explicitly documented and tested

## Gherkin Keywords

- **Feature**: High-level description of a software feature
- **Scenario**: Concrete example of the feature in action
- **Given**: Preconditions and context
- **When**: Actions taken by the user/system
- **Then**: Expected outcomes
- **And**: Additional conditions or outcomes
- **But**: Negative conditions or outcomes
- **Background**: Steps that run before each scenario in a feature

## Best Practices

1. Use **declarative** steps that focus on _what_, not _how_
2. Keep scenarios **focused** and **independent**
3. Use **data tables** for multiple similar examples
4. Use **Scenario Outline** for parameterized tests
5. Write from the **user's perspective**
6. Keep step definitions **reusable**
7. Use **meaningful names** for scenarios

## Example Scenario with Data Table

```gherkin
Scenario: Multiple train delays
  Given the following trains:
    | departure | delay | status       |
    | 08:00     | 0     | ON_TIME      |
    | 09:00     | 3     | MINOR_DELAY  |
    | 10:00     | 12    | MAJOR_DELAY  |
  When I check each train status
  Then the status should match the expected values
```

## References

- [jest-cucumber Documentation](https://github.com/bencompton/jest-cucumber)
- [Gherkin Reference](https://cucumber.io/docs/gherkin/reference/)
- [BDD Best Practices](https://cucumber.io/docs/bdd/)
