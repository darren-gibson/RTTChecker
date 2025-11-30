Feature: Train Selection
  As a commuter
  I want the system to select the most suitable train
  So that I can plan my journey effectively

  Scenario: Select earliest train within time window
    Given the current time is 08:00 UK local time
    And I want to travel from Cambridge to Kings Cross
    Given the following trains are available:
      | departure | arrival | destination |
      | 08:10     | 09:10   | KNGX        |
      | 08:30     | 09:30   | KNGX        |
      | 08:50     | 09:50   | KNGX        |
    When I search for a train at least 5 minutes from now with a 60 minute window
    Then the system should select the 08:10 train

  Scenario: Exclude trains outside the time window
    Given the current time is 08:00 UK local time
    And I want to travel from Cambridge to Kings Cross
    And the following trains are available:
      | departure | arrival | destination |
      | 08:05     | 09:05   | KNGX        |
      | 08:25     | 09:25   | KNGX        |
      | 09:30     | 10:30   | KNGX        |
    When I search for a train at least 20 minutes from now with a 60 minute window
    Then the system should select the 08:25 train

  Scenario: Select fastest train when multiple options available
    Given the current time is 08:00 UK local time
    And I want to travel from Cambridge to Kings Cross
    And the following trains are available:
      | departure | arrival | destination |
      | 08:30     | 09:45   | KNGX        |
      | 08:40     | 09:30   | KNGX        |
      | 08:50     | 09:50   | KNGX        |
    When I search for a train at least 20 minutes from now with a 60 minute window
    Then the system should select the 08:40 train
    And it should arrive at 09:30

  Scenario: Handle next-day departure rollover
    Given the current time is 23:50 UK local time
    And I want to travel from Cambridge to Kings Cross
    And the following trains are available:
      | departure | arrival | destination |
      | 00:10     | 01:10   | KNGX        |
    When I search for a train at least 5 minutes from now with a 120 minute window
    Then the system should select the 00:10 train
    And it should be treated as tomorrow's service

  Scenario: No suitable trains available
    Given the current time is 08:00 UK local time
    And I want to travel from Cambridge to Kings Cross
    And the following trains are available:
      | departure | arrival | destination |
      | 06:00     | 07:00   | KNGX        |
      | 11:00     | 12:00   | KNGX        |
    When I search for a train at least 20 minutes from now with a 60 minute window
    Then no train should be selected
    And the status should be "UNKNOWN"
