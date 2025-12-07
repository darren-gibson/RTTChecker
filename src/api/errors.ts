import { RTTCheckerError, ErrorOptions } from '../errors.js';

export interface RTTApiErrorOptions extends ErrorOptions {
  statusCode?: number;
  responseBody?: unknown;
  endpoint?: string;
}

/**
 * Error thrown when RTT API request fails.
 * Includes HTTP status code and response details.
 */
export class RTTApiError extends RTTCheckerError {
  public readonly statusCode?: number;
  public readonly responseBody?: unknown;
  public readonly endpoint?: string;

  constructor(message: string, options: RTTApiErrorOptions = {}) {
    super(message, options);
    this.statusCode = options.statusCode;
    this.responseBody = options.responseBody;
    this.endpoint = options.endpoint;
  }

  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  isRetryable(): boolean {
    return (this.statusCode !== undefined && this.statusCode >= 500) || !this.statusCode;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      endpoint: this.endpoint,
      isAuthError: this.isAuthError(),
      isRetryable: this.isRetryable(),
    };
  }
}
