import { loggers } from '../../utils/logger.js';

const log = loggers.matter;

/**
 * Base behavior initialization helper
 * Provides common logging pattern for behavior initialization
 */
export class BaseBehaviorHelper {
  /**
   * Log behavior initialization start
   */
  static logInitStart(behaviorName: string): void {
    log.debug(`Initializing ${behaviorName}...`);
  }

  /**
   * Log behavior initialization completion
   */
  static logInitComplete(behaviorName: string): void {
    log.debug(`Initialized ${behaviorName}`);
  }

  /**
   * Wrap initialize call with standard logging
   */
  static async wrapInitialize(behaviorName: string, initFn: () => Promise<void>): Promise<void> {
    this.logInitStart(behaviorName);
    await initFn();
    this.logInitComplete(behaviorName);
  }
}

/**
 * Common temperature sensor constants
 */
export const TemperatureConstants = {
  MIN_CELSIUS: -10,
  MAX_CELSIUS: 50,
  MIN_MEASURED_VALUE: -1000, // -10.00°C in 0.01°C units
  MAX_MEASURED_VALUE: 5000, // 50.00°C in 0.01°C units
  CELSIUS_TO_MEASURED_VALUE: 100, // Conversion factor
  NO_SERVICE_SENTINEL: 5000, // 50°C for no service
};

/**
 * Convert Celsius to Matter measured value
 */
export function celsiusToMeasuredValue(celsius: number): number {
  return Math.round(celsius * TemperatureConstants.CELSIUS_TO_MEASURED_VALUE);
}

/**
 * Clamp delay within valid temperature range
 */
export function clampDelay(delayMinutes: number): number {
  return Math.min(
    Math.max(delayMinutes, TemperatureConstants.MIN_CELSIUS),
    TemperatureConstants.MAX_CELSIUS
  );
}
