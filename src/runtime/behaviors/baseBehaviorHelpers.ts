import { loggers } from '../../utils/logger.js';

const log = loggers.matter;

/**
 * Base behavior initialization helper
 * Provides common logging pattern for behavior initialization
 */
export class BaseBehaviorHelper {
  /**
   * Log behavior initialization start
   * @param {string} behaviorName - Name of the behavior being initialized
   */
  static logInitStart(behaviorName) {
    log.debug(`Initializing ${behaviorName}...`);
  }

  /**
   * Log behavior initialization completion
   * @param {string} behaviorName - Name of the behavior that was initialized
   */
  static logInitComplete(behaviorName) {
    log.debug(`Initialized ${behaviorName}`);
  }

  /**
   * Wrap initialize call with standard logging
   * @param {string} behaviorName - Name of the behavior
   * @param {Function} initFn - Initialization function to execute
   */
  static async wrapInitialize(behaviorName, initFn) {
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
 * @param {number} celsius - Temperature in Celsius
 * @returns {number} Temperature in 0.01°C units
 */
export function celsiusToMeasuredValue(celsius) {
  return Math.round(celsius * TemperatureConstants.CELSIUS_TO_MEASURED_VALUE);
}

/**
 * Clamp delay within valid temperature range
 * @param {number} delayMinutes - Delay in minutes
 * @returns {number} Clamped delay
 */
export function clampDelay(delayMinutes) {
  return Math.min(
    Math.max(delayMinutes, TemperatureConstants.MIN_CELSIUS),
    TemperatureConstants.MAX_CELSIUS
  );
}
