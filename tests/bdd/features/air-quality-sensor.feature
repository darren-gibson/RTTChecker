Feature: Air Quality Sensor for Train Status
  As a smart home user
  I want train punctuality displayed as air quality levels
  So that I can see color-coded train status in Google Home

  Background:
    Given a Matter-enabled RTT Checker with air quality sensor is running
    And I have configured my route from Cambridge to Kings Cross

  Scenario: On-time train shows Good air quality (Green)
    Given my train is running on time
    When I query the air quality sensor device
    Then the air quality should be "Good"
    And it should display as green in Google Home
    And the numeric value should be 1

  Scenario: Minor delay shows Fair air quality (Yellow)
    Given my train has a 4 minute delay
    When I query the air quality sensor device
    Then the air quality should be "Fair"
    And it should display as yellow in Google Home
    And the numeric value should be 2

  Scenario: Moderate delay shows Moderate air quality (Orange)
    Given my train has a 7 minute delay
    When I query the air quality sensor device
    Then the air quality should be "Moderate"
    And it should display as orange in Google Home
    And the numeric value should be 3

  Scenario: Major delay shows Poor air quality (Red)
    Given my train has a 15 minute delay
    When I query the air quality sensor device
    Then the air quality should be "Poor"
    And it should display as red in Google Home
    And the numeric value should be 4

  Scenario: Unknown status shows VeryPoor air quality (Dark Red)
    Given the train status is unknown
    When I query the air quality sensor device
    Then the air quality should be "VeryPoor"
    And it should display as dark red in Google Home
    And the numeric value should be 5

  Scenario: Critical status shows VeryPoor air quality (Dark Red)
    Given the train status is critical
    When I query the air quality sensor device
    Then the air quality should be "VeryPoor"
    And it should display as dark red in Google Home
    And the numeric value should be 5

  Scenario: Air quality improves as train recovers from delay
    Given my train has a 15 minute delay
    And the air quality sensor shows "Poor"
    When the delay reduces to 7 minutes
    Then the air quality should change to "Moderate"
    And the sensor should emit a change event
    And it should display as orange in Google Home

  Scenario: Air quality degrades as train becomes delayed
    Given my train is running on time
    And the air quality sensor shows "Good"
    When the train develops a 15 minute delay
    Then the air quality should change to "Poor"
    And the sensor should emit a change event
    And it should display as red in Google Home

  Scenario: Air quality updates with status transitions
    Given the air quality sensor is initialized
    When the train status changes as follows:
      | status      | expected_quality | expected_value |
      | on_time     | Good             | 1              |
      | minor_delay | Fair             | 2              |
      | delayed     | Moderate         | 3              |
      | major_delay | Poor             | 4              |
      | unknown     | VeryPoor         | 5              |
    Then each transition should update the air quality correctly
    And the sensor should emit change events for each transition

  Scenario: Initial state is Unknown air quality
    Given a new air quality sensor is created
    When no train status update has occurred
    Then the air quality should be "Unknown"
    And the numeric value should be 0

  Scenario: Voice query reports air quality status
    Given my train has a 7 minute delay
    And the air quality sensor shows "Moderate"
    When I ask "What's the air quality?"
    Then Google Home should respond with "Moderate"
    And display an orange badge

  Scenario: Multiple endpoints work together
    Given the Matter server has temperature, mode, and air quality endpoints
    When my train has a 7 minute delay
    Then the temperature sensor should show 7°C
    And the mode device should show "delayed"
    And the air quality sensor should show "Moderate"
    And all three should update simultaneously

  Scenario: Air quality handles API errors gracefully
    Given the air quality sensor is showing "Good"
    When the RTT API fails to respond
    Then the air quality should remain at "Good"
    And the sensor should stay in its current state
    And retry on the next update cycle

  Scenario Outline: Air quality maps correctly for all delay ranges
    Given my train has a <delay_minutes> minute delay
    When I query the air quality sensor
    Then the air quality should be "<quality>"
    And the numeric value should be <value>
    And it should display as <color> in Google Home

    Examples:
      | delay_minutes | quality  | value | color     |
      | 0             | Good     | 1     | green     |
      | 1             | Good     | 1     | green     |
      | 2             | Good     | 1     | green     |
      | 3             | Fair     | 2     | yellow    |
      | 4             | Fair     | 2     | yellow    |
      | 5             | Fair     | 2     | yellow    |
      | 6             | Moderate | 3     | orange    |
      | 7             | Moderate | 3     | orange    |
      | 10            | Moderate | 3     | orange    |
      | 11            | Poor     | 4     | red       |
      | 15            | Poor     | 4     | red       |
      | 30            | Poor     | 4     | red       |
      | 60            | Poor     | 4     | red       |
