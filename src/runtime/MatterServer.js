import { createHash } from 'crypto';

import { TemperatureMeasurementServer } from '@matter/main/behaviors/temperature-measurement';
import { ModeSelectServer } from '@matter/main/behaviors/mode-select';
import { UserLabelServer } from '@matter/main/behaviors/user-label';
import { FixedLabelServer } from '@matter/main/behaviors/fixed-label';

import { config } from '../config.js';
import { loggers } from '../utils/logger.js';
import { STATUS_TO_MODE, MODE_TO_STATUS, deriveModeFromDelay } from '../domain/modeMapping.js';

import { printCommissioningInfo } from './helpers/commissioningHelpers.js';
import { ensureAggregatorRoot } from './helpers/bridgeSetup.js';
import { createServerNode } from './helpers/serverNodeFactory.js';
import { makeBridgedInfoBehavior, setEndpointName } from './helpers/matterHelpers.js';
import { createEndpoints } from './helpers/endpointFactory.js';

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
    const modeValue = STATUS_TO_MODE[statusCode] ?? STATUS_TO_MODE.unknown;
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

// Use helper to generate BD-BI behaviors

const BridgedInfoTemp = makeBridgedInfoBehavior({
  productName: config.matter.delayDeviceName,
  nodeLabel: config.matter.delayDeviceName,
  uniqueIdFactory: () => makeUniqueId('TEMP'),
});

const BridgedInfoMode = makeBridgedInfoBehavior({
  productName: config.matter.statusDeviceName,
  nodeLabel: config.matter.statusDeviceName,
  uniqueIdFactory: () => makeUniqueId('MODE'),
});

/**
 * Initialize and start the Matter server with train status device
 */
export async function startMatterServer(trainDevice) {
  log.info('🔧 Initializing Matter server (v0.15 API)...');
  log.info('   Storage directory: .matter-storage/');
  log.info(`   Bridge mode: ${config.matter.useBridge ? 'enabled' : 'disabled'}`);

  // Create Matter server node via factory
  const { node } = await createServerNode(config);

  log.info('✅ Matter server node created');

  // Ensure the root endpoint is marked as an Aggregator for bridged devices
  if (config.matter.useBridge) {
    await ensureAggregatorRoot(node, log);
  }

  // Helpers moved to ./helpers/matterHelpers.js

  // Add endpoints via factory
  log.info(
    `📝 Adding endpoints: temperature "${config.matter.delayDeviceName}", mode "${config.matter.statusDeviceName}"`
  );
  const tempBehaviors = [TrainTemperatureServer, UserLabelServer, FixedLabelServer];
  const modeBehaviors = [TrainStatusModeServer, UserLabelServer, FixedLabelServer];
  if (config.matter.useBridge) {
    tempBehaviors.push(BridgedInfoTemp);
    modeBehaviors.push(BridgedInfoMode);
  }
  let tempSensor, modeDevice;
  try {
    const endpoints = await createEndpoints(node, { tempBehaviors, modeBehaviors });
    tempSensor = endpoints.tempSensor;
    modeDevice = endpoints.modeDevice;
    log.info('   ✓ Endpoints added');
  } catch (e) {
    log.error('   ❌ Failed adding endpoints');
    log.error(e?.stack || e);
    throw e;
  }

  // Display commissioning QR code
  printCommissioningInfo(node, log, config);

  // Connect the train device to update endpoints
  if (trainDevice) {
    log.info('🔗 Connecting train device to Matter endpoints...');

    // Set friendly labels; BD-BI already initialized with names when bridged
    try {
      await setEndpointName(tempSensor, config.matter.delayDeviceName);
      await setEndpointName(modeDevice, config.matter.statusDeviceName);
      log.info('   ✓ Endpoint labels set');
    } catch (e) {
      log.warn('   ⚠️ Could not set endpoint labels via UserLabel:', e);
    }

    trainDevice.on('statusChange', async (status) => {
      log.debug('Train status changed:', status);
      try {
        // Derive mode from delay when available; otherwise use currentMode or unknown
        let computedMode = deriveModeFromDelay(status?.delayMinutes);
        // Fallback to provided currentMode if derivation failed (e.g., non-numeric)
        if (Number.isNaN(Number(status?.delayMinutes)) && typeof status?.currentMode === 'number') {
          computedMode = status.currentMode;
        }

        await modeDevice.act(async (agent) => {
          const statusCode = MODE_TO_STATUS[computedMode] || 'unknown';
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
