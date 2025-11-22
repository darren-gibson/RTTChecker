/**
 * Custom error types for RTTChecker application.
 * Provides structured error classification for better error handling and debugging.
 * @module errors
 */

/**
 * Base error class for all RTTChecker errors.
 * @extends Error
 */
export class RTTCheckerError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = options.context || {};
    
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error for logging or transmission.
   * @returns {Object} Plain object representation of error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack
    };
  }
}

/**
 * Error thrown when RTT API request fails.
 * Includes HTTP status code and response details.
 */
export class RTTApiError extends RTTCheckerError {
  constructor(message, options = {}) {
    super(message, options);
    this.statusCode = options.statusCode;
    this.responseBody = options.responseBody;
    this.endpoint = options.endpoint;
  }

  /**
   * Check if error is due to authentication failure.
   * @returns {boolean} True if 401/403 status code
   */
  isAuthError() {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  /**
   * Check if error is retryable (5xx, network issues).
   * @returns {boolean} True if error might succeed on retry
   */
  isRetryable() {
    return this.statusCode >= 500 || !this.statusCode; // No status = network error
  }

  toJSON() {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      endpoint: this.endpoint,
      isAuthError: this.isAuthError(),
      isRetryable: this.isRetryable()
    };
  }
}

/**
 * Error thrown when no suitable train service is found.
 * Indicates search criteria were too restrictive or no trains available.
 */
export class NoTrainFoundError extends RTTCheckerError {
  constructor(message, options = {}) {
    super(message, options);
    this.originTiploc = options.originTiploc;
    this.destTiploc = options.destTiploc;
    this.searchWindow = options.searchWindow;
    this.candidateCount = options.candidateCount || 0;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      originTiploc: this.originTiploc,
      destTiploc: this.destTiploc,
      searchWindow: this.searchWindow,
      candidateCount: this.candidateCount
    };
  }
}

/**
 * Error thrown when configuration is invalid or missing.
 * Used during startup validation.
 */
export class ConfigurationError extends RTTCheckerError {
  constructor(message, options = {}) {
    super(message, options);
    this.missingFields = options.missingFields || [];
    this.invalidFields = options.invalidFields || [];
  }

  toJSON() {
    return {
      ...super.toJSON(),
      missingFields: this.missingFields,
      invalidFields: this.invalidFields
    };
  }
}

/**
 * Error thrown when train data is malformed or missing expected fields.
 * Indicates RTT API response doesn't match expected schema.
 */
export class InvalidTrainDataError extends RTTCheckerError {
  constructor(message, options = {}) {
    super(message, options);
    this.serviceId = options.serviceId;
    this.missingField = options.missingField;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      serviceId: this.serviceId,
      missingField: this.missingField
    };
  }
}
