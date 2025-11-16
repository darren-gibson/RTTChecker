/**
 * Application configuration
 * Loads and validates environment variables with sensible defaults
 */

export const config = {
  // RTT API credentials
  rtt: {
    user: process.env.RTT_USER,
    pass: process.env.RTT_PASS
  },

  // Train search defaults
  train: {
    originTiploc: process.env.ORIGIN_TIPLOC || 'CAMBDGE',
    destTiploc: process.env.DEST_TIPLOC || 'KNGX',
    minAfterMinutes: Number(process.env.MIN_AFTER_MINUTES || 20),
    windowMinutes: Number(process.env.WINDOW_MINUTES || 60)
  },

  // Server configuration (for testing/debugging)
  server: {
    port: Number(process.env.PORT || 8080),
    nodeEnv: process.env.NODE_ENV
  },

  // Matter device configuration
  matter: {
    deviceName: process.env.DEVICE_NAME || 'Train Status',
    vendorName: process.env.VENDOR_NAME || 'RTT Checker',
    productName: process.env.PRODUCT_NAME || 'Train Status Monitor',
    serialNumber: process.env.SERIAL_NUMBER || 'RTT-001',
    discriminator: Number(process.env.DISCRIMINATOR || 3840),
    passcode: Number(process.env.PASSCODE || 20202021)
  }
};

// Derive per-endpoint names (can be overridden by explicit env vars)
config.matter.statusDeviceName = process.env.STATUS_DEVICE_NAME || `${config.train.originTiploc}→${config.train.destTiploc} Train Status`;
config.matter.delayDeviceName = process.env.DELAY_DEVICE_NAME || `${config.train.originTiploc}→${config.train.destTiploc} Train Delay`;

/**
 * Check if running in test environment
 */
export const isTestEnv = () => config.server.nodeEnv === 'test';

/**
 * Check if running in production environment
 */
export const isProductionEnv = () => config.server.nodeEnv === 'production';
