import { Environment } from '@matter/main';
import { StorageBackendDisk } from '@matter/nodejs';
import { ServerNode } from '@matter/main';
import { TemperatureSensorDevice } from '@matter/main/devices/temperature-sensor';
import { ModeSelectDevice } from '@matter/main/devices/mode-select';
import { TemperatureMeasurementServer } from '@matter/main/behaviors/temperature-measurement';
import { ModeSelectServer } from '@matter/main/behaviors/mode-select';
import qr from 'qrcode-terminal';

import { MatterDevice as MatterConstants } from '../constants.js';
import { config } from '../config.js';
import { loggers } from '../utils/logger.js';

/**
 * Matter Server Implementation (v0.15 API)
 * Creates a discoverable Matter device that Google Home can commission
 */

const log = loggers.matter;

/**
 * Custom Temperature Measurement Behavior
 * Allows updating temperature from external source (train delay)
 */
class TrainTemperatureServer extends TemperatureMeasurementServer {
  async setDelayMinutes(delayMinutes) {
    const tempCelsius = Math.min(Math.max(delayMinutes, -10), 50);
    const tempValue = Math.round(tempCelsius * 100);
    await this.setMeasuredValue(tempValue);
  }

  async setTemperature(tempCelsius) {
    const tempValue = Math.round(tempCelsius * 100);
    await this.setMeasuredValue(tempValue);
  }

  async setMeasuredValue(value) {
    this.state.measuredValue = value;
  }
}

/**
 * Custom Mode Select Behavior
 * Represents train status as mode selection
 */
class TrainStatusModeServer extends ModeSelectServer {
  async setTrainStatus(statusCode) {
    // Map status codes to modes
    const modeMap = {
      on_time: 0,
      delayed: 1,
      cancelled: 2,
      unknown: 3,
    };

    const modeValue = modeMap[statusCode] ?? modeMap.unknown;
    await this.changeToMode({ newMode: modeValue });
  }

  async initialize() {
    // Define available modes and required attributes BEFORE calling super.initialize()
    // This ensures supportedModes is set when currentMode is validated
    this.state.description = 'Train punctuality status';
    this.state.standardNamespace = null; // No standard namespace for custom modes
    this.state.supportedModes = [
      { label: 'On Time', mode: 0, semanticTags: [] },
      { label: 'Delayed', mode: 1, semanticTags: [] },
      { label: 'Cancelled', mode: 2, semanticTags: [] },
      { label: 'Unknown', mode: 3, semanticTags: [] },
    ];
    this.state.currentMode = 3; // Start as unknown
    
    await super.initialize?.();
  }
}

/**
 * Initialize and start the Matter server with train status device
 */
export async function startMatterServer(trainDevice) {
  log.info('🔧 Initializing Matter server (v0.15 API)...');
  log.info('   Storage directory: .matter-storage/');

  // Configure environment with storage backend
  const environment = Environment.default;
  environment.vars.set('storage.path', '.matter-storage');
  environment.set(StorageBackendDisk, new StorageBackendDisk('.matter-storage'));

  // Create Matter server node
  const node = await ServerNode.create({
    id: 'rtt-checker',
    network: {
      port: config.matter.port,
    },
    commissioning: {
      passcode: config.matter.passcode,
      discriminator: config.matter.discriminator,
    },
    productDescription: {
      name: config.matter.deviceName,
      deviceType: ModeSelectDevice.deviceType,
    },
    basicInformation: {
      vendorName: config.matter.vendorName,
      vendorId: MatterConstants.VendorId,
      nodeLabel: config.matter.deviceName,
      productName: config.matter.deviceName,
      productLabel: config.matter.deviceName,
      productId: MatterConstants.ProductId,
      serialNumber: config.matter.serialNumber,
      hardwareVersion: 1,
      hardwareVersionString: '1.0',
      softwareVersion: 1,
      softwareVersionString: '1.0',
    },
  });

  log.info('✅ Matter server node created');

  // Add temperature sensor endpoint
  log.info(`📝 Adding temperature sensor: "${config.matter.delayDeviceName}"`);
  const tempSensor = await node.add(TemperatureSensorDevice.with(TrainTemperatureServer));
  log.info(`   ✓ Temperature sensor added`);

  // Add mode select device endpoint
  log.info(`📝 Adding mode select device: "${config.matter.statusDeviceName}"`);
  const modeDevice = await node.add(ModeSelectDevice.with(TrainStatusModeServer));
  log.info(`   ✓ Mode select device added`);

  // Display commissioning QR code
  const { qrPairingCode, manualPairingCode } = node.state.commissioning.pairingCodes;

  log.info('📱 Commissioning information:');
  log.info(`   Discriminator: ${config.matter.discriminator}`);
  log.info(`   Passcode: ${config.matter.passcode}`);
  log.info(`   Manual pairing code: ${manualPairingCode}`);
  log.info('');
  log.info('🔳 Scan QR code with Google Home app:');
  qr.generate(qrPairingCode, { small: true }, (qrCode) => {
    log.info('\n' + qrCode);
  });

  // Connect the train device to update endpoints
  if (trainDevice) {
    log.info('🔗 Connecting train device to Matter endpoints...');

    trainDevice.on('statusChanged', async (status) => {
      log.debug('Train status changed:', status);
      try {
        await modeDevice.act(async (agent) => {
          await agent.modeSelect.setTrainStatus(status.statusCode);
        });

        if (status.delayMinutes !== undefined) {
          await tempSensor.act(async (agent) => {
            await agent.temperatureMeasurement.setDelayMinutes(status.delayMinutes);
          });
        }
      } catch (error) {
        log.error('Error updating Matter endpoints:', error);
      }
    });

    log.info('   ✓ Train device event listeners attached');
  }

  // Start the server
  log.info('🚀 Starting Matter server...');
  await node.run();

  log.info('✅ Matter server running and discoverable');
  log.info(`   Listening on port: ${config.matter.port}`);
  log.info('   Ready for commissioning with Google Home');

  return {
    node,
    tempSensor,
    modeDevice,
    close: async () => {
      log.info('🛑 Shutting down Matter server...');
      await node.close();
      log.info('✅ Matter server shut down');
    },
  };
}
