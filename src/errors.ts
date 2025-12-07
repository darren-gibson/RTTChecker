/**
 * Custom error types for RTTChecker application.
 * Provides structured error classification for better error handling and debugging.
 * @module errors
 */

export interface ErrorOptions {
  context?: Record<string, unknown>;
  missingFields?: string[];
  invalidFields?: string[];
}

/**
 * Base error class for all RTTChecker errors.
 * @extends Error
 */
export class RTTCheckerError extends Error {
  public readonly timestamp: Date;
  public readonly context: Record<string, unknown>;

  constructor(message: string, options: ErrorOptions = {}) {
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
   * @returns Plain object representation of error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
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
  public readonly missingFields: string[];
  public readonly invalidFields: string[];

  constructor(message: string, options: ErrorOptions = {}) {
    super(message, options);
    this.missingFields = options.missingFields || [];
    this.invalidFields = options.invalidFields || [];
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      missingFields: this.missingFields,
      invalidFields: this.invalidFields,
    };
  }
}

/**
 * Error thrown when train data is malformed or missing expected fields.
 * Indicates RTT API response doesn't match expected schema.
 */
// Moved to src/domain/errors.js
