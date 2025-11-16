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

/**
 * Sanitize device name for Matter compatibility
 * Matter device names should be simple ASCII strings
 */
function sanitizeDeviceName(name) {
  // Replace arrow with simple dash, limit to alphanumeric + spaces + basic punctuation
  return name
    .replace(/→/g, '-')
    .replace(/[^\x20-\x7E]/g, '') // Keep only printable ASCII
    .trim()
    .substring(0, 64); // Matter has name length limits
}

// Derive per-endpoint names (can be overridden by explicit env vars)
const defaultStatusName = `${config.train.originTiploc}-${config.train.destTiploc} Train Status`;
const defaultDelayName = `${config.train.originTiploc}-${config.train.destTiploc} Train Delay`;

config.matter.statusDeviceName = sanitizeDeviceName(process.env.STATUS_DEVICE_NAME || defaultStatusName);
config.matter.delayDeviceName = sanitizeDeviceName(process.env.DELAY_DEVICE_NAME || defaultDelayName);

/**
 * Check if running in test environment
 */
export const isTestEnv = () => config.server.nodeEnv === 'test';

/**
 * Check if running in production environment
 */
export const isProductionEnv = () => config.server.nodeEnv === 'production';
