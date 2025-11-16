import { StorageBackendDisk, StorageManager } from '@project-chip/matter-node.js/storage';
import { MatterServer, CommissioningServer } from '@project-chip/matter.js';
import qr from 'qrcode-terminal';
import { TrainStatusDevice } from './MatterDevice.js';
import { TrainStatusModeDevice } from './TrainStatusModeDevice.js';
import { TrainStatusTemperatureSensor } from './TrainStatusAirQualityDevice.js';
import { MatterDevice as MatterConstants } from './constants.js';
import { config } from './config.js';

/**
 * Matter Server Implementation
 * Creates a discoverable Matter device that Google Home can commission
 */

// Note: Default logging from matter.js is sufficient

/**
 * Initialize and start the Matter server with train status device
 */
export async function startMatterServer(trainDevice) {
  console.log('🔧 Initializing Matter server...');

  // Storage for commissioning data
  const storageManager = new StorageManager(new StorageBackendDisk('.matter-storage'));
  storageManager.initialize();

  // Create Matter server
  const matterServer = new MatterServer(storageManager);

  // Create commissioning server with pairing info
  const commissioningServer = new CommissioningServer({
    port: 5540,
    deviceName: config.matter.deviceName,
    deviceType: MatterConstants.DeviceType,
    basicInformation: {
      vendorName: config.matter.vendorName,
      vendorId: MatterConstants.VendorId,
      nodeLabel: config.matter.productName,
      productName: config.matter.productName,
      productLabel: config.matter.productName,
      productId: MatterConstants.ProductId,
      serialNumber: config.matter.serialNumber,
      uniqueId: config.matter.serialNumber,
    },
    passcode: config.matter.passcode,
    discriminator: config.matter.discriminator,
  });

  console.log('📡 Matter server created');
  console.log(`   Discriminator: ${config.matter.discriminator}`);
  console.log(`   Passcode: ${config.matter.passcode}`);

  // Generate QR code for commissioning
  const { qrPairingCode, manualPairingCode } = commissioningServer.getPairingCode();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📱 COMMISSION THIS DEVICE WITH GOOGLE HOME');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n1️⃣  Open Google Home app on your phone');
  console.log('2️⃣  Tap + → Add device → New device');  
  console.log('3️⃣  Select your home');
  console.log('4️⃣  Scan this QR code or enter manual code:\n');
  try {
    qr.generate(qrPairingCode, { small: true });
  } catch (e) {
    console.log(`QR: ${qrPairingCode}`);
  }
  console.log(`\n   Manual pairing code: ${manualPairingCode}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create devices with unique, meaningful names derived from route (can be overridden by env vars)
  const modeDevice = new TrainStatusModeDevice(config.matter.statusDeviceName);
  const tempSensor = new TrainStatusTemperatureSensor(config.matter.delayDeviceName);

  // Update devices when train status changes
  trainDevice.on('statusChange', (change) => {
    // Update Mode Select device
    modeDevice.setCurrentMode(change.currentMode);

    // Update temperature sensor with delay minutes (1:1 mapping: delay = temperature)
    // Extract delay from trainStatus if available, otherwise use mode-based estimate
    let delayMinutes = 0;
    
    if (change.trainStatus) {
      // Try to get actual delay from train status
      const service = change.selectedService;
      if (service?.rtd || service?.etd) {
        // Calculate delay from real-time vs expected times
        // This is a simplified estimate; real logic would parse time strings
        delayMinutes = 0; // Placeholder for actual delay calculation
      }
    }
    
    // Fallback to mode-based delay estimates if no real delay data
    if (delayMinutes === 0) {
      const modeToDelay = {
        0: 0,    // ON_TIME: 0 min = 0°C
        1: 3,    // MINOR_DELAY: ~3 min = ~3°C
        2: 10,   // DELAYED: ~10 min = ~10°C
        3: 20,   // MAJOR_DELAY: ~20 min = ~20°C
        4: -999, // UNKNOWN: use special sentinel
      };
      delayMinutes = modeToDelay[change.currentMode] ?? 0;
    }
    
    // Update temperature sensor (direct 1:1 mapping)
    if (delayMinutes === -999) {
      // Unknown: set to 0°C (on time default)
      tempSensor.setDelayMinutes(0);
    } else {
      tempSensor.setDelayMinutes(delayMinutes);
    }
  });

  // Initial state
  modeDevice.setCurrentMode(trainDevice.getCurrentMode());
  tempSensor.setDelayMinutes(0); // Start at on-time baseline (0°C = on time)

  // Add endpoints to commissioning server
  commissioningServer.addDevice(modeDevice);
  commissioningServer.addDevice(tempSensor);
  await matterServer.addCommissioningServer(commissioningServer);

  // Start the server
  await matterServer.start();

  console.log('✅ Matter server started and ready for commissioning');
  console.log('   Waiting for Google Home to connect...\n');

  // Note: matter.js does not emit a generic 'commissioned' event here; pairing will complete in the controller UI.

  return { matterServer, commissioningServer };
}
