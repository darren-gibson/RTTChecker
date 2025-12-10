/**
 * Configuration defaults and initialization
 * @module config/defaults
 */

import { sanitizeTiploc, clampValue } from '../utils/validation.js';

import type { Config } from './configTypes.js';
import { sanitizeDeviceName } from './configSanitization.js';

// Helper to safely access process.env with proper typing
const env = process.env as Record<string, string | undefined>;

/**
 * Application configuration object
 */
export const config: Config = {
  // RTT API credentials
  rtt: {
    user: env['RTT_USER'],
    pass: env['RTT_PASS'],
  },

  // Train search defaults (sanitize TIPLOCs and clamp numeric values)
  train: {
    originTiploc: sanitizeTiploc(env['ORIGIN_TIPLOC'] || 'CAMBDGE'),
    destTiploc: sanitizeTiploc(env['DEST_TIPLOC'] || 'KNGX'),
    minAfterMinutes: clampValue(Number(env['MIN_AFTER_MINUTES'] || 20), 0, 1440),
    windowMinutes: clampValue(Number(env['WINDOW_MINUTES'] || 60), 1, 1440),
  },

  // Server configuration (for testing/debugging, clamp port to valid range)
  server: {
    port: clampValue(Number(env['PORT'] || 8080), 1, 65535),
    nodeEnv: env['NODE_ENV'],
  },

  // Matter device configuration (clamp discriminator and passcode to valid ranges)
  matter: {
    deviceName: env['DEVICE_NAME'] || 'Train Status',
    vendorName: env['VENDOR_NAME'] || 'RTT Checker',
    productName: env['PRODUCT_NAME'] || 'Train Status Monitor',
    serialNumber: env['SERIAL_NUMBER'] || 'RTT-001',
    discriminator: clampValue(Number(env['DISCRIMINATOR'] || 3840), 0, 4095),
    passcode: clampValue(Number(env['PASSCODE'] || 20202021), 20000000, 99999999),
    // Use a Bridge (Aggregator) to group endpoints under a single device.
    // Set USE_BRIDGE=false to expose endpoints directly without a bridge in controllers like Google Home.
    useBridge: (env['USE_BRIDGE'] ?? 'true').toLowerCase() !== 'false',
    // Which visualisation endpoint to expose to controllers ("mode" or "airQuality").
    // This only affects which endpoint is presented as the primary device when not using a bridge.
    primaryEndpoint:
      env['PRIMARY_ENDPOINT']?.toLowerCase() === 'airquality' ? 'airQuality' : 'mode',
  },
};

// Derive per-endpoint names (can be overridden by explicit env vars)
const defaultStatusName = `${config.train.originTiploc}-${config.train.destTiploc} Train Status`;
const defaultDelayName = `${config.train.originTiploc}-${config.train.destTiploc} Train Delay`;
const defaultAirQualityName = `${config.train.originTiploc}-${config.train.destTiploc} Train Punctuality`;

config.matter.statusDeviceName = sanitizeDeviceName(env['STATUS_DEVICE_NAME'] || defaultStatusName);
config.matter.delayDeviceName = sanitizeDeviceName(env['DELAY_DEVICE_NAME'] || defaultDelayName);
config.matter.airQualityDeviceName = sanitizeDeviceName(
  env['AIR_QUALITY_DEVICE_NAME'] || defaultAirQualityName
);

/**
 * Check if running in test environment
 * @returns {boolean} True if NODE_ENV is 'test'
 */
export const isTestEnv = () => config.server.nodeEnv === 'test';

/**
 * Check if running in production environment
 * @returns {boolean} True if NODE_ENV is 'production'
 */
export const isProductionEnv = () => config.server.nodeEnv === 'production';
