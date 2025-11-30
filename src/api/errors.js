import { RTTCheckerError } from '../errors.js';

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

  isAuthError() { return this.statusCode === 401 || this.statusCode === 403; }
  isRetryable() { return this.statusCode >= 500 || !this.statusCode; }

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
