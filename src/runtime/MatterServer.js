import { StorageBackendDisk, StorageManager } from '@project-chip/matter-node.js/storage';
import { MatterServer, CommissioningServer } from '@project-chip/matter.js';
import { BridgedDeviceBasicInformationCluster } from '@project-chip/matter.js/cluster';
import { Aggregator } from '@project-chip/matter.js/device';
import qr from 'qrcode-terminal';

import { TrainStatusModeDevice } from '../devices/TrainStatusModeDevice.js';
import { TrainStatusTemperatureSensor } from '../devices/TrainStatusTemperatureSensor.js';
import { MatterDevice as MatterConstants } from '../constants.js';
import { config } from '../config.js';
import { loggers } from '../utils/logger.js';

/**
 * Matter Server Implementation
 * Creates a discoverable Matter device that Google Home can commission
 */

const log = loggers.matter;

/**
 * Create Matter endpoint devices (Mode Select and Temperature Sensor)
 * Optionally wraps them in a Bridge (Aggregator) if useBridge is true
 */
function createEndpoints() {
  log.info('📝 Creating Matter endpoints:');
  log.info(`   Mode Select Device: "${config.matter.statusDeviceName}"`);
  log.info(`   Temperature Sensor: "${config.matter.delayDeviceName}"`);
  
  const modeDevice = new TrainStatusModeDevice(config.matter.statusDeviceName);
  const tempSensor = new TrainStatusTemperatureSensor(config.matter.delayDeviceName);
  
  log.info(`   ✓ Mode Select created with name: "${modeDevice.name}"`);
  log.info(`   ✓ Temperature Sensor created with name: "${tempSensor.name}"`);

  let aggregator = null;
  if (config.matter.useBridge) {
    log.info('🧩 Configuring bridge (Aggregator) for per-endpoint names...');
    aggregator = new Aggregator();
    
    try {
      aggregator.addBridgedDevice(modeDevice, {
        vendorName: config.matter.vendorName,
        vendorId: MatterConstants.VendorId,
        productId: MatterConstants.ProductId,
        productName: config.matter.statusDeviceName,
        productLabel: config.matter.statusDeviceName,
        nodeLabel: config.matter.statusDeviceName,
        hardwareVersion: 1,
        hardwareVersionString: '1.0',
        softwareVersion: 1,
        softwareVersionString: '1.0',
        serialNumber: `${config.matter.serialNumber}-MODE`,
        reachable: true,
        uniqueId: `${config.matter.serialNumber}-MODE`,
      });
      log.info('   ✓ Bridged: Mode Select');
      const biMode = modeDevice.getClusterServer(BridgedDeviceBasicInformationCluster);
      if (biMode) {
        log.debug('      Bridged Mode Select attributes:', {
          nodeLabel: biMode.getNodeLabelAttribute(),
          productName: biMode.getProductNameAttribute(),
          productLabel: biMode.getProductLabelAttribute(),
          serialNumber: biMode.getSerialNumberAttribute(),
          uniqueId: biMode.getUniqueIdAttribute?.()
        });
      } else {
        log.debug('      Bridged Mode Select BasicInformation cluster not found');
      }
    } catch (e) {
      log.warn('   ⚠️  Could not add bridged info for Mode Select:', e?.message || e);
      aggregator.addBridgedDevice(modeDevice);
    }
    
    try {
      aggregator.addBridgedDevice(tempSensor, {
        vendorName: config.matter.vendorName,
        vendorId: MatterConstants.VendorId,
        productId: MatterConstants.ProductId,
        productName: config.matter.delayDeviceName,
        productLabel: config.matter.delayDeviceName,
        nodeLabel: config.matter.delayDeviceName,
        hardwareVersion: 1,
        hardwareVersionString: '1.0',
        softwareVersion: 1,
        softwareVersionString: '1.0',
        serialNumber: `${config.matter.serialNumber}-TEMP`,
        reachable: true,
        uniqueId: `${config.matter.serialNumber}-TEMP`,
      });
      log.info('   ✓ Bridged: Temperature Sensor');
      const biTemp = tempSensor.getClusterServer(BridgedDeviceBasicInformationCluster);
      if (biTemp) {
        log.debug('      Bridged Temperature Sensor attributes:', {
          nodeLabel: biTemp.getNodeLabelAttribute(),
          productName: biTemp.getProductNameAttribute(),
          productLabel: biTemp.getProductLabelAttribute(),
          serialNumber: biTemp.getSerialNumberAttribute(),
          uniqueId: biTemp.getUniqueIdAttribute?.()
        });
      } else {
        log.debug('      Bridged Temperature Sensor BasicInformation cluster not found');
      }
    } catch (e) {
      log.warn('   ⚠️  Could not add bridged info for Temperature Sensor:', e?.message || e);
      aggregator.addBridgedDevice(tempSensor);
    }
  } else {
    log.info('🔗 Bridge disabled (USE_BRIDGE=false). Exposing endpoints directly.');
  }

  return { modeDevice, tempSensor, aggregator };
}

/**
 * Register devices with commissioning server
 * Handles both bridge mode (single aggregator) and direct mode (two devices)
 */
function registerDevices(commissioningServer, { modeDevice, tempSensor, aggregator }) {
  log.info('🔌 Registering endpoints with commissioning server...');
  
  if (config.matter.useBridge && aggregator) {
    commissioningServer.addDevice(aggregator);
    log.info('   ✓ Added Aggregator (Bridge) endpoint with Mode Select and Temperature Sensor');
  } else {
    commissioningServer.addDevice(modeDevice);
    log.info(`   ✓ Added Mode Select endpoint: "${config.matter.statusDeviceName}"`);
    commissioningServer.addDevice(tempSensor);
    log.info(`   ✓ Added Temperature Sensor endpoint: "${config.matter.delayDeviceName}"`);
  }
}

/**
 * Initialize and start the Matter server with train status device
 */
export async function startMatterServer(trainDevice) {
  log.info('🔧 Initializing Matter server...');
  log.info('   Storage directory: .matter-storage/');

  // Storage for commissioning data
  const storageManager = new StorageManager(new StorageBackendDisk('.matter-storage'));
  await storageManager.initialize();
  
  // Check if device is already commissioned
  storageManager.createContext('0');
  try {
    // Check if FabricManager storage exists
    const fabricManagerContext = storageManager.createContext('FabricManager');
    const fabrics = fabricManagerContext.get('fabrics');
    
    if (fabrics && Array.isArray(fabrics) && fabrics.length > 0) {
  log.warn('WARNING: Device is already commissioned!');
  log.warn(`   Found ${fabrics.length} existing fabric(s)`);
  log.warn('   To re-commission, delete .matter-storage/ directory first:');
  log.warn('   rm -rf .matter-storage/');
  log.warn('   Then restart the server.\n');
    } else {
  log.info('   ✓ No existing fabrics - ready for commissioning\n');
    }
  } catch (_error) {
    // Storage key doesn't exist yet - device not commissioned
  log.info('   ✓ No existing fabrics - ready for commissioning\n');
  }

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

  log.info('📡 Matter server created');
  // Mask discriminator and passcode at non-debug levels to avoid leaking full credentials.
  const maskValue = (val, visible = 3) => {
    const s = String(val);
    if (log.debug) { // still log full when DEBUG level active
      return s;
    }
    if (s.length <= visible) return '*'.repeat(s.length);
    return '*'.repeat(Math.max(0, s.length - visible)) + s.slice(-visible);
  };
  log.info(`   Discriminator: ${maskValue(config.matter.discriminator)}`);
  log.info(`   Passcode: ${maskValue(config.matter.passcode)}`);

  // Generate QR code for commissioning
  const { qrPairingCode, manualPairingCode } = commissioningServer.getPairingCode();
  
  log.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log.info('📱 COMMISSION THIS DEVICE WITH GOOGLE HOME');
  log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log.info('\n1️⃣  Open Google Home app on your phone');
  log.info('2️⃣  Tap + → Add device → New device');  
  log.info('3️⃣  Select your home');
  log.info('4️⃣  Scan this QR code or enter manual code:\n');
  try {
    qr.generate(qrPairingCode, { small: true });
  } catch (_e) {
    log.info(`QR: ${qrPairingCode}`);
  }
  const pairingMasked = maskValue(manualPairingCode, 4);
  log.info(`\n   Manual pairing code: ${pairingMasked} (masked)\n`);
  log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create endpoints (with optional bridge)
  const { modeDevice, tempSensor, aggregator } = createEndpoints();

  // Update devices when train status changes
  // Event payload: { timestamp, previousMode, currentMode, modeChanged, trainStatus, selectedService, raw, error }
  trainDevice.on('statusChange', (change) => {
    // Update Mode Select device (always reflect current status, even if error/unknown)
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
        4: 99,   // UNKNOWN: 99 min = 99°C (very high to signal problem)
      };
      delayMinutes = modeToDelay[change.currentMode] ?? 99;
    }
    
    // Update temperature sensor (direct 1:1 mapping)
    tempSensor.setDelayMinutes(delayMinutes);
  });  // Initial state: Start with UNKNOWN until first real update
  modeDevice.setCurrentMode(MatterConstants.Modes.UNKNOWN.mode);
  tempSensor.setDelayMinutes(99); // 99°C = unknown/error state

  // Register endpoints with commissioning server
  registerDevices(commissioningServer, { modeDevice, tempSensor, aggregator });
  
  await matterServer.addCommissioningServer(commissioningServer);
  log.info('   ✓ Commissioning server registered with Matter server');

  // Start the server
  await matterServer.start();

  log.info('✅ Matter server started and ready for commissioning');
  log.info('   mDNS broadcast on port 5353 (UDP)');
  log.info('   Matter server on port 5540 (UDP)');
  log.info('   Waiting for Google Home to connect...\n');
  
  log.info('🔍 Troubleshooting Tips:');
  log.info('   • Ensure phone and device are on the SAME WiFi network');
  log.info('   • Check firewall allows UDP ports 5353 and 5540');
  log.info('   • If stuck, delete .matter-storage/ and restart');
  log.info('   • Try disabling VPN on your phone');
  log.info('');

  // Note: matter.js does not emit a generic 'commissioned' event here; pairing will complete in the controller UI.

  return { matterServer, commissioningServer };
}
