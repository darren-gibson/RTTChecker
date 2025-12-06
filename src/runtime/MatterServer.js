import { createHash } from 'crypto';

import { Environment } from '@matter/main';
import { StorageBackendDisk } from '@matter/nodejs';
import { ServerNode } from '@matter/main';
import { TemperatureSensorDevice } from '@matter/main/devices/temperature-sensor';
import { ModeSelectDevice } from '@matter/main/devices/mode-select';
import { TemperatureMeasurementServer } from '@matter/main/behaviors/temperature-measurement';
import { ModeSelectServer } from '@matter/main/behaviors/mode-select';
import { UserLabelServer } from '@matter/main/behaviors/user-label';
import { FixedLabelServer } from '@matter/main/behaviors/fixed-label';
import { BridgedDeviceBasicInformationServer } from '@matter/main/behaviors/bridged-device-basic-information';
import { DescriptorServer } from '@matter/main/behaviors/descriptor';
import qr from 'qrcode-terminal';

import { MatterDevice as MatterConstants, Timing } from '../constants.js';
import { config } from '../config.js';
import { loggers } from '../utils/logger.js';

/**
 * Matter Server Implementation (v0.15 API)
 * Creates a discoverable Matter device that Google Home can commission
 */

const log = loggers.matter;

function makeUniqueId(suffix) {
  const base = `${config.matter.serialNumber}-${suffix}`;
  const hash = createHash('sha256').update(base).digest('hex');
  // UniqueId must be 32 chars; take first 32 hex chars
  return hash.slice(0, 32);
}

/**
 * Custom Temperature Measurement Behavior
 * Allows updating temperature from external source (train delay)
 */
class TrainTemperatureServer extends TemperatureMeasurementServer {
  async initialize() {
    log.debug('Initializing TrainTemperatureServer...');
    this.state.minMeasuredValue = -1000; // -10.00°C
    this.state.maxMeasuredValue = 5000; // 50.00°C
    this.state.measuredValue = null; // unknown until first update
    await super.initialize?.();
    log.debug('Initialized TrainTemperatureServer');
  }
  async setDelayMinutes(delayMinutes) {
    if (delayMinutes == null) {
      // Unknown delay → expose unknown temperature by setting measuredValue to null
      await this.setMeasuredValue(null);
      return;
    }
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
    // Map status codes to modes (from constants.js)
    const modeMap = {
      on_time: 0,
      minor_delay: 1,
      delayed: 2,
      major_delay: 3,
      unknown: 4,
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
      { label: 'Minor Delay', mode: 1, semanticTags: [] },
      { label: 'Delayed', mode: 2, semanticTags: [] },
      { label: 'Major Delay', mode: 3, semanticTags: [] },
      { label: 'Unknown', mode: 4, semanticTags: [] },
    ];
    this.state.currentMode = 4; // Start as unknown

    try {
      await super.initialize?.();
    } catch (err) {
      log.error('BridgedInfoMode super.initialize failed:', err?.stack || err);
      throw err;
    }
  }
}

/**
 * Bridged Device Basic Information per-endpoint defaults
 */
class BridgedInfoTemp extends BridgedDeviceBasicInformationServer {
  async initialize() {
    log.debug('Initializing BridgedInfoTemp...');
    this.state.vendorName = config.matter.vendorName;
    this.state.vendorId = MatterConstants.VendorId;
    this.state.productName = config.matter.delayDeviceName;
    this.state.productId = MatterConstants.ProductId;
    this.state.productLabel = config.matter.delayDeviceName;
    this.state.nodeLabel = config.matter.delayDeviceName;
    this.state.reachable = true;
    this.state.serialNumber = config.matter.serialNumber;
    this.state.manufacturingDate = '2024-01-01';
    this.state.productAppearance = { finish: 0, primaryColor: 0 };
    this.state.uniqueId = makeUniqueId('TEMP');
    this.state.hardwareVersion = 1;
    this.state.hardwareVersionString = '1.0';
    this.state.softwareVersion = 1;
    this.state.softwareVersionString = '1.0';
    try {
      log.debug('BridgedInfoTemp state:', JSON.stringify(this.state));
    } catch (e) {
      // ignore JSON stringify errors
    }
    await super.initialize?.();
    log.debug('Initialized BridgedInfoTemp');
  }
}

class BridgedInfoMode extends BridgedDeviceBasicInformationServer {
  async initialize() {
    log.debug('Initializing BridgedInfoMode...');
    this.state.vendorName = config.matter.vendorName;
    this.state.vendorId = MatterConstants.VendorId;
    this.state.productName = config.matter.statusDeviceName;
    this.state.productId = MatterConstants.ProductId;
    this.state.productLabel = config.matter.statusDeviceName;
    this.state.nodeLabel = config.matter.statusDeviceName;
    this.state.reachable = true;
    this.state.serialNumber = config.matter.serialNumber;
    this.state.manufacturingDate = '2024-01-01';
    this.state.productAppearance = { finish: 0, primaryColor: 0 };
    this.state.uniqueId = makeUniqueId('MODE');
    this.state.hardwareVersion = 1;
    this.state.hardwareVersionString = '1.0';
    this.state.softwareVersion = 1;
    this.state.softwareVersionString = '1.0';
    try {
      log.debug('BridgedInfoMode state:', JSON.stringify(this.state));
    } catch (e) {
      // ignore JSON stringify errors
    }
    await super.initialize?.();
    log.debug('Initialized BridgedInfoMode');
  }
}

/**
 * Initialize and start the Matter server with train status device
 */
export async function startMatterServer(trainDevice) {
  log.info('🔧 Initializing Matter server (v0.15 API)...');
  log.info('   Storage directory: .matter-storage/');
  log.info(`   Bridge mode: ${config.matter.useBridge ? 'enabled' : 'disabled'}`);

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
      name: config.matter.useBridge ? config.matter.productName : config.matter.statusDeviceName,
      deviceType: config.matter.useBridge ? 0x000e /* Aggregator */ : ModeSelectDevice.deviceType,
    },
    basicInformation: {
      vendorName: config.matter.vendorName,
      vendorId: MatterConstants.VendorId,
      nodeLabel: config.matter.statusDeviceName,
      productName: config.matter.productName,
      productLabel: config.matter.productName,
      productId: MatterConstants.ProductId,
      serialNumber: config.matter.serialNumber,
      hardwareVersion: 1,
      hardwareVersionString: '1.0',
      softwareVersion: 1,
      softwareVersionString: '1.0',
    },
  });

  log.info('✅ Matter server node created');

  // Ensure the root endpoint is marked as an Aggregator for bridged devices
  if (config.matter.useBridge) {
    await node.act(async (agent) => {
      const descriptor = await agent.load(DescriptorServer);
      if (!descriptor.hasDeviceType(0x000e)) {
        descriptor.addDeviceTypes('Aggregator');
        log.info('   ✓ Root marked as Aggregator device type');
      }
    });
  }

  // Add temperature sensor endpoint
  log.info(`📝 Adding temperature sensor: "${config.matter.delayDeviceName}"`);
  const tempBehaviors = [TrainTemperatureServer, UserLabelServer, FixedLabelServer];
  if (config.matter.useBridge) tempBehaviors.push(BridgedInfoTemp);
  let tempSensor;
  try {
    // Assign explicit endpoint identity to avoid generic part names
    tempSensor = await node.add(TemperatureSensorDevice.with(...tempBehaviors), {
      id: 'temperature',
      number: 1,
    });
    log.info(`   ✓ Temperature sensor added`);
  } catch (e) {
    log.error('   ❌ Failed adding temperature sensor endpoint');
    log.error(e?.stack || e);
    throw e;
  }

  // Add mode select device endpoint
  log.info(`📝 Adding mode select device: "${config.matter.statusDeviceName}"`);
  const modeBehaviors = [TrainStatusModeServer, UserLabelServer, FixedLabelServer];
  if (config.matter.useBridge) modeBehaviors.push(BridgedInfoMode);
  let modeDevice;
  try {
    // Assign explicit endpoint identity to avoid generic part names
    modeDevice = await node.add(ModeSelectDevice.with(...modeBehaviors), {
      id: 'mode',
      number: 2,
    });
    log.info(`   ✓ Mode select device added`);
  } catch (e) {
    log.error('   ❌ Failed adding mode select endpoint');
    log.error(e?.stack || e);
    throw e;
  }

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

    // Set friendly labels; BD-BI already initialized with names when bridged
    try {
      await tempSensor.act(async (agent) => {
        if (agent.userLabel?.setLabelList) {
          await agent.userLabel.setLabelList([
            { label: 'Name', value: config.matter.delayDeviceName },
          ]);
        }
        if (agent.fixedLabel?.setLabelList) {
          await agent.fixedLabel.setLabelList([
            { label: 'Name', value: config.matter.delayDeviceName },
          ]);
        }
      });
      await modeDevice.act(async (agent) => {
        if (agent.userLabel?.setLabelList) {
          await agent.userLabel.setLabelList([
            { label: 'Name', value: config.matter.statusDeviceName },
          ]);
        }
        if (agent.fixedLabel?.setLabelList) {
          await agent.fixedLabel.setLabelList([
            { label: 'Name', value: config.matter.statusDeviceName },
          ]);
        }
      });
      log.info('   ✓ Endpoint labels set');
    } catch (e) {
      log.warn('   ⚠️ Could not set endpoint labels via UserLabel:', e);
    }

    trainDevice.on('statusChange', async (status) => {
      log.debug('Train status changed:', status);
      try {
        // Map currentMode back to statusCode string for the behavior
        const modeToStatus = {
          0: 'on_time',
          1: 'minor_delay',
          2: 'delayed',
          3: 'major_delay',
          4: 'unknown',
        };

        // Derive mode from delay when available; otherwise use currentMode or unknown
        let computedMode = 4;
        if (status?.delayMinutes == null) {
          computedMode = 4;
        } else {
          const delay = Number(status.delayMinutes);
          const abs = Math.abs(delay);
          if (abs <= Timing.LATE_THRESHOLDS.ON_TIME) {
            computedMode = 0; // on time (includes small early/late within threshold)
          } else if (abs <= Timing.LATE_THRESHOLDS.MINOR) {
            computedMode = 1; // minor delay
          } else if (abs <= Timing.LATE_THRESHOLDS.DELAYED) {
            computedMode = 2; // delayed
          } else {
            computedMode = 3; // major delay
          }
        }
        // Fallback to provided currentMode if derivation failed (e.g., non-numeric)
        if (Number.isNaN(Number(status?.delayMinutes)) && typeof status?.currentMode === 'number') {
          computedMode = status.currentMode;
        }

        await modeDevice.act(async (agent) => {
          const statusCode = modeToStatus[computedMode] || 'unknown';
          await agent.modeSelect.setTrainStatus(statusCode);
        });

        // Update temperature sensor from delay minutes (nullable supported)
        await tempSensor.act(async (agent) => {
          await agent.temperatureMeasurement.setDelayMinutes(status?.delayMinutes ?? null);
        });

        // Calculate delay from the current mode
        // For now, we'll just update based on available data
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
