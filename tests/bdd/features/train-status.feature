Feature: Train Status Assessment
  As a commuter
  I want to know if my train is on time, delayed, or cancelled
  So that I can adjust my plans accordingly

  Background:
    Given I am checking train status from Cambridge to Kings Cross
    And the current time is 12:00 UK local time

  Scenario: Train running on time
    Given a train is scheduled to depart at 12:22
    And the realtime departure is 12:22
    When I check the train status
    Then the status should be "ON_TIME"
    And the assessment should be "good"

  Scenario: Train with minor delay (1-5 minutes)
    Given a train is scheduled to depart at 12:22
    And the realtime departure is 12:26
    When I check the train status
    Then the status should be "MINOR_DELAY"
    And the delay should be 4 minutes
    And the assessment should be "acceptable"

  Scenario: Train with moderate delay (6-10 minutes)
    Given a train is scheduled to depart at 12:22
    And the realtime departure is 12:30
    When I check the train status
    Then the status should be "DELAYED"
    And the delay should be 8 minutes
    And the assessment should be "concerning"

  Scenario: Train with major delay (over 10 minutes)
    Given a train is scheduled to depart at 14:10
    And the realtime departure is 14:22
    When I check the train status
    Then the status should be "MAJOR_DELAY"
    And the delay should be 12 minutes
    And the assessment should be "poor"

  Scenario: Cancelled train
    Given a train is scheduled to depart at 13:13
    And the train is marked as cancelled
    When I check the train status
    Then the status should be "MAJOR_DELAY"
    And the assessment should be "very poor"
    And the display should show "CANCELLED_CALL"

  Scenario: Unknown status when no suitable train found
    Given no trains match my criteria
    When I check the train status
    Then the status should be "UNKNOWN"
    And no train should be selected
