Feature: API Resilience and Retry Logic
  As a system administrator
  I want the system to handle API failures gracefully
  So that temporary network issues don't cause permanent failures

  Background:
    Given the RTT API client is configured
    And I have valid authentication credentials

  Scenario: Successful API call on first attempt
    Given the RTT API is available
    When I make a search request
    Then the request should succeed immediately
    And no retries should be attempted

  Scenario: Retry on transient server errors
    Given the RTT API responds with a 503 Service Unavailable
    And the API will succeed on the second attempt
    When I make a search request
    Then the system should retry the request
    And the request should eventually succeed
    And I should receive valid train data

  Scenario: Exponential backoff between retries
    Given the RTT API is experiencing issues
    When I make a search request requiring retries
    Then the first retry should wait approximately 1 second
    And the second retry should wait approximately 2 seconds
    And jitter should be applied to prevent thundering herd

  Scenario: Authentication errors are not retried
    Given the RTT API responds with 401 Unauthorized
    When I make a search request
    Then the request should fail immediately
    And no retries should be attempted
    And an authentication error should be logged

  Scenario: Give up after maximum retries
    Given the RTT API continuously returns 503 errors
    When I make a search request
    Then the system should retry up to the maximum attempts
    And the request should eventually fail
    And the final error should be reported

  Scenario: Client errors are not retried
    Given the RTT API responds with 400 Bad Request
    When I make a search request
    Then the request should fail immediately
    And no retries should be attempted

  Scenario Outline: Retryable vs non-retryable status codes
    Given the RTT API responds with status code <status_code>
    When I make a search request
    Then the request should <action>

    Examples:
      | status_code | action              |
      | 200         | succeed immediately |
      | 401         | fail without retry  |
      | 403         | fail without retry  |
      | 404         | fail without retry  |
      | 429         | retry with backoff  |
      | 500         | retry with backoff  |
      | 502         | retry with backoff  |
      | 503         | retry with backoff  |
      | 504         | retry with backoff  |
