import { StorageBackendDisk, StorageManager } from '@project-chip/matter-node.js/storage';
import { MatterServer, CommissioningServer } from '@project-chip/matter-node.js';
import qr from 'qrcode-terminal';
import { TrainStatusDevice } from './MatterDevice.js';
import { TrainStatusModeDevice } from './TrainStatusModeDevice.js';
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

  // Create a Mode Select device with 5 train status modes
  const modeDevice = new TrainStatusModeDevice();

  // Update mode when train status changes
  trainDevice.on('statusChange', (change) => {
    modeDevice.setCurrentMode(change.currentMode);
  });

  // Initial state
  modeDevice.setCurrentMode(trainDevice.getCurrentMode());

  // Add endpoint to commissioning server
  commissioningServer.addDevice(modeDevice);
  await matterServer.addCommissioningServer(commissioningServer);

  // Start the server
  await matterServer.start();

  console.log('✅ Matter server started and ready for commissioning');
  console.log('   Waiting for Google Home to connect...\n');

  // Note: matter.js does not emit a generic 'commissioned' event here; pairing will complete in the controller UI.

  return { matterServer, commissioningServer };
}
