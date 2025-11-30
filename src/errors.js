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
// Moved to src/api/errors.js

/**
 * Error thrown when no suitable train service is found.
 * Indicates search criteria were too restrictive or no trains available.
 */
// Moved to src/domain/errors.js

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
// Moved to src/domain/errors.js
