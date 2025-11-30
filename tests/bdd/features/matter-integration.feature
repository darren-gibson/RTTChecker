Feature: Matter Device Integration
  As a smart home user
  I want my train status exposed through Matter devices
  So that I can integrate it with Google Home and other smart home systems

  Background:
    Given a Matter-enabled RTT Checker is running
    And I have configured my route from Cambridge to Kings Cross

  Scenario: Temperature sensor reflects train status
    Given my train is running on time
    When I query the temperature sensor device
    Then the temperature should be 20°C
    And the device name should include "Train Status"

  Scenario: Temperature increases with delays
    Given my train has a 4 minute delay
    When I query the temperature sensor device
    Then the temperature should be 21°C
    And it should indicate "MINOR_DELAY"

  Scenario: Temperature sensor shows maximum on major delays
    Given my train has a 15 minute delay
    When I query the temperature sensor device
    Then the temperature should be 23°C
    And it should indicate "MAJOR_DELAY"

  Scenario: Mode device reflects train status
    Given my train is running on time
    When I query the mode device
    Then the current mode should be "on_time"
    And supported modes should include:
      | mode         |
      | on_time      |
      | minor_delay  |
      | delayed      |
      | major_delay  |
      | unknown      |

  Scenario: Mode device updates when status changes
    Given the mode device shows "on_time"
    When my train status changes to delayed
    Then the mode device should emit a change event
    And the current mode should be "delayed"

  Scenario: Periodic updates maintain device state
    Given the device is configured with 60 second update interval
    When I start periodic updates
    Then the device should fetch train status regularly
    And emit events when the status changes

  Scenario: Device handles API errors gracefully
    Given the RTT API is temporarily unavailable
    When the device tries to update train status
    Then the device should remain in its current state
    And log a warning about the API unavailability
    And retry on the next update cycle
