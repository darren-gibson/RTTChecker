Feature: Matter Server Startup Initialization
  As a Matter device developer
  I want the device to initialize correctly on startup
  So that the first status update is captured and air quality displays correctly from the start

  Background:
    Given the RTT API is available
    And I have configured my route from Cambridge to Kings Cross

  @critical @startup
  Scenario: First status update is captured after server initialization
    Given the Matter server is not yet started
    When I start the RTT Checker application
    Then the Matter server should initialize first
    And event listeners should be attached to the train device
    And periodic status updates should start after the server is ready
    And the first train status should be received by Matter endpoints
    And the air quality sensor should reflect the actual train status

  @critical @startup
  Scenario: Zero delay train shows Good air quality from startup
    Given my train is running with 0 minutes delay
    When I start the RTT Checker application
    And wait for the first status update
    Then the air quality should be "Good"
    And it should display as green in Google Home
    And the numeric value should be 1
    And the temperature sensor should show 0 degrees

  @critical @startup
  Scenario: Delayed train shows correct air quality from startup
    Given my train has a 15 minute delay
    When I start the RTT Checker application
    And wait for the first status update
    Then the air quality should be "Poor"
    And it should display as red in Google Home
    And the numeric value should be 4
    And the temperature sensor should show 15 degrees

  @startup @sequence
  Scenario: Initialization sequence is correct
    Given the Matter server is not yet started
    When I start the RTT Checker application
    Then I should see "Initializing Matter server" logged
    And I should see "Matter server running and discoverable" logged
    And I should see "Device ready" logged
    And I should see "Started periodic updates" logged
    And the log sequence should be in the correct order

  @startup @events
  Scenario: Event listeners are ready before first update
    Given the Matter server is not yet started
    When I start the RTT Checker application
    Then the statusChange event listener should be attached
    And the first statusChange event should be handled
    And no events should be lost during initialization

  @startup @air-quality
  Scenario Outline: Air quality initializes correctly for different train statuses
    Given my train has a <delay> minute delay
    When I start the RTT Checker application
    And wait for the first status update
    Then the air quality should be "<quality>"
    And it should display as <color> in Google Home
    And the numeric value should be <value>

    Examples:
      | delay | quality  | color  | value |
      | 0     | Good     | green  | 1     |
      | 2     | Good     | green  | 1     |
      | 3     | Fair     | yellow | 2     |
      | 5     | Fair     | yellow | 2     |
      | 6     | Moderate | orange | 3     |
      | 10    | Moderate | orange | 3     |
      | 11    | Poor     | red    | 4     |
      | 60    | Poor     | red    | 4     |

  @startup @regression
  Scenario: No race condition with rapid status changes
    Given the Matter server is not yet started
    And my train status will change within 100ms of startup
    When I start the RTT Checker application
    Then all status updates should be captured
    And the air quality should reflect the latest train status
    And no updates should be lost during initialization
