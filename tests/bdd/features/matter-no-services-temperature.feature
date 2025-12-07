Feature: Matter status when no services are available
  As a smart home user
  I want the temperature sensor to reflect "unknown" when no trains are running
  So that I am not misled by a 0°C delay reading

  Background:
    Given a Matter-enabled RTT Checker is running
    And I have configured my route from Cambridge to Kings Cross

  Scenario: On-time train uses 0 temperature
    Given the train status is on_time
    When I query the Matter temperature sensor device
    Then the temperature sensor should expose a value of 0

  Scenario: No suitable train found uses sentinel temperature
    Given no trains match my criteria
    And the train status is unknown
    When I query the Matter temperature sensor device
    Then the mode device should show "unknown"
    And the temperature sensor should expose the sentinel value 50

  Scenario: First update with no services shows sentinel temperature
    Given the device has just started
    And no trains match my criteria
    When the device performs its first status update
    Then a statusChange event should be emitted
    And the event should indicate no service found
    And the temperature sensor should expose the sentinel value 50
