import { RTTCheckerError } from '../errors.js';

/**
 * Error thrown when no suitable train service is found.
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
    return { ...super.toJSON(), originTiploc: this.originTiploc, destTiploc: this.destTiploc, searchWindow: this.searchWindow, candidateCount: this.candidateCount };
  }
}

/**
 * Error thrown when train data is malformed or missing expected fields.
 */
export class InvalidTrainDataError extends RTTCheckerError {
  constructor(message, options = {}) {
    super(message, options);
    this.serviceId = options.serviceId;
    this.missingField = options.missingField;
  }
  toJSON() { return { ...super.toJSON(), serviceId: this.serviceId, missingField: this.missingField }; }
}
