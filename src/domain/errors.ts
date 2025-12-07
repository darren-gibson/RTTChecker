import { RTTCheckerError, ErrorOptions } from '../errors.js';

export interface NoTrainFoundErrorOptions extends ErrorOptions {
  originTiploc?: string;
  destTiploc?: string;
  searchWindow?: string;
  candidateCount?: number;
}

/**
 * Error thrown when no suitable train service is found.
 */
export class NoTrainFoundError extends RTTCheckerError {
  public readonly originTiploc?: string;
  public readonly destTiploc?: string;
  public readonly searchWindow?: string;
  public readonly candidateCount: number;

  constructor(message: string, options: NoTrainFoundErrorOptions = {}) {
    super(message, options);
    this.originTiploc = options.originTiploc;
    this.destTiploc = options.destTiploc;
    this.searchWindow = options.searchWindow;
    this.candidateCount = options.candidateCount || 0;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      originTiploc: this.originTiploc,
      destTiploc: this.destTiploc,
      searchWindow: this.searchWindow,
      candidateCount: this.candidateCount,
    };
  }
}

export interface InvalidTrainDataErrorOptions extends ErrorOptions {
  serviceId?: string;
  missingField?: string;
}

/**
 * Error thrown when train data is malformed or missing expected fields.
 */
export class InvalidTrainDataError extends RTTCheckerError {
  public readonly serviceId?: string;
  public readonly missingField?: string;

  constructor(message: string, options: InvalidTrainDataErrorOptions = {}) {
    super(message, options);
    this.serviceId = options.serviceId;
    this.missingField = options.missingField;
  }

  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), serviceId: this.serviceId, missingField: this.missingField };
  }
}
