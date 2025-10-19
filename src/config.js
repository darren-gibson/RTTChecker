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

  // Server configuration
  server: {
    port: Number(process.env.PORT || 8080),
    nodeEnv: process.env.NODE_ENV
  },

  // Google Home device configuration
  googleHome: {
    agentUserId: 'user-123',
    deviceId: 'train_1',
    deviceName: 'My Train'
  }
};

/**
 * Check if running in test environment
 */
export const isTestEnv = () => config.server.nodeEnv === 'test';

/**
 * Check if running in production environment
 */
export const isProductionEnv = () => config.server.nodeEnv === 'production';
