import { TrainStatusDevice } from "./src/MatterDevice.js";
import { startMatterServer } from "./src/MatterServer.js";
import { isTestEnv, validateConfig } from "./src/config.js";

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
    console.error(error.message);
    process.exit(1);
  }
  
  console.log('🚆 Starting Matter Train Status Device...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const deviceInfo = device.getDeviceInfo();
  console.log('Device Information:');
  console.log(`  Name: ${deviceInfo.deviceName}`);
  console.log(`  Vendor: ${deviceInfo.vendorName}`);
  console.log(`  Product: ${deviceInfo.productName}`);
  console.log(`  Serial: ${deviceInfo.serialNumber}`);
  console.log('');
  
  // Start periodic status updates for train data
  device.startPeriodicUpdates();
  
  // Start Matter server for Google Home integration
  let matterServer;
  startMatterServer(device)
    .then((servers) => {
      matterServer = servers.matterServer;
      console.log('🎯 Device ready! Monitor train status updates below:\n');
    })
    .catch((error) => {
      console.error('❌ Failed to start Matter server:', error);
      process.exit(1);
    });
  
  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    device.stopPeriodicUpdates();
    
    if (matterServer) {
      try {
        await matterServer.close();
        console.log('✅ Matter server closed');
      } catch (err) {
        console.error('Error closing Matter server:', err);
      }
    }
    
    console.log('👋 Goodbye!');
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
