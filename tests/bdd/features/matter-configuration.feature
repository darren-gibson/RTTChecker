Feature: Matter configuration for endpoints
  As an advanced user
  I want to configure how Matter endpoints are exposed
  So that I can choose between Mode and Air Quality devices

  Scenario: Default configuration exposes Mode endpoint when not using a bridge
    Given I am using the default configuration
    And USE_BRIDGE is set to false
    When the Matter server starts
    Then the primary visualisation endpoint should be the Mode device

  Scenario: Configuration exposes Air Quality endpoint when PRIMARY_ENDPOINT=airQuality
    Given I am using the default configuration
    And USE_BRIDGE is set to false
    And PRIMARY_ENDPOINT is set to "airQuality"
    When the Matter server starts
    Then the primary visualisation endpoint should be the Air Quality device

  Scenario: Bridge mode exposes both Mode and Air Quality endpoints
    Given I am using the default configuration
    And USE_BRIDGE is set to true
    And PRIMARY_ENDPOINT is set to "airQuality"
    When the Matter server starts
    Then both Mode and Air Quality endpoints should be available under the bridge
