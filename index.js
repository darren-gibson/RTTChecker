import { TrainStatusDevice } from "./src/MatterDevice.js";
import { startMatterServer } from "./src/MatterServer.js";
import { isTestEnv, validateConfig } from "./src/config.js";
import { log } from "./src/logger.js";

/**
 * Matter Train Status Device
 * Reports train punctuality and can be commissioned by Google Home
 */

// Create the device instance
const device = new TrainStatusDevice();

// Export device for testing
export { device };

// Start device only when not in test environment
if (!isTestEnv()) {
  // Validate configuration early
  try {
    validateConfig();
  } catch (error) {
    log.error(error.message);
    process.exit(1);
  }
  
  log.info('🚆 Starting Matter Train Status Device...');
  log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const deviceInfo = device.getDeviceInfo();
  log.info('Device Information:');
  log.info(`  Name: ${deviceInfo.deviceName}`);
  log.info(`  Vendor: ${deviceInfo.vendorName}`);
  log.info(`  Product: ${deviceInfo.productName}`);
  log.info(`  Serial: ${deviceInfo.serialNumber}`);
  log.info('');
  
  // Start periodic status updates for train data
  device.startPeriodicUpdates();
  
  // Start Matter server for Google Home integration
  let matterServer;
  startMatterServer(device)
    .then((servers) => {
      matterServer = servers.matterServer;
      log.info('🎯 Device ready! Monitor train status updates below:\n');
    })
    .catch((error) => {
      log.error('❌ Failed to start Matter server:', error);
      process.exit(1);
    });
  
  // Handle graceful shutdown
  const shutdown = async () => {
    log.info('\n\n🛑 Shutting down gracefully...');
    device.stopPeriodicUpdates();
    
    if (matterServer) {
      try {
        await matterServer.close();
        log.info('✅ Matter server closed');
      } catch (err) {
        log.error('Error closing Matter server:', err);
      }
    }
    
    log.info('👋 Goodbye!');
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
