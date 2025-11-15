import { TrainStatusDevice } from "./src/MatterDevice.js";
import { isTestEnv } from "./src/config.js";

/**
 * Matter Train Status Device
 * Reports train punctuality using Mode Select cluster
 */

// Create the device instance
const device = new TrainStatusDevice();

// Export device for testing
export { device };

// Start device only when not in test environment
if (!isTestEnv()) {
  console.log('Starting Matter Train Status Device...');
  console.log('Device Info:', device.getDeviceInfo());
  console.log('Supported Modes:', device.getSupportedModes());
  
  // Start periodic status updates
  device.startPeriodicUpdates();
  
  // Log initial status
  console.log(`Current mode: ${device.getCurrentMode()}`);
  console.log('Device is running. Press Ctrl+C to stop.');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    device.stopPeriodicUpdates();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    device.stopPeriodicUpdates();
    process.exit(0);
  });
}
