/**
 * Error handling utilities for TrainStatusDevice
 * Centralized error classification and logging
 * @module devices/errorHandlers
 */

import type { Logger } from 'pino';

import { RTTCheckerError } from '../errors.js';
import { RTTApiError } from '../api/errors.js';
import { NoTrainFoundError } from '../domain/errors.js';

/**
 * Log train status update errors with appropriate severity and context
 *
 * @param error - Error that occurred during train status update
 * @param log - Logger instance
 */
export function logTrainStatusError(error: unknown, log: Logger): void {
  if (error instanceof RTTApiError) {
    if (error.isAuthError()) {
      log.error('❌ RTT API authentication failed. Check RTT_USER and RTT_PASS credentials.');
    } else if (error.isRetryable()) {
      log.warn(
        `⚠️  RTT API temporarily unavailable (${error.statusCode}). Will retry on next update.`
      );
    } else {
      log.error(`❌ RTT API error: ${error.message} (status: ${error.statusCode})`);
    }
  } else if (error instanceof NoTrainFoundError) {
    log.warn(`⚠️  No suitable train found: ${error.message}`);
  } else if (error instanceof RTTCheckerError) {
    log.error(`❌ RTTChecker error: ${error.message}`);
  } else {
    const err = error as Error;
    log.error(`❌ Failed to update train status: ${err.message}`);
  }
}

/**
 * Extract error message from unknown error type
 *
 * @param error - Unknown error object
 * @returns Error message string
 */
export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
