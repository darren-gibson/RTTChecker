import { createHash } from 'crypto';

import { UserLabelServer } from '@matter/main/behaviors/user-label';
import { FixedLabelServer } from '@matter/main/behaviors/fixed-label';
import type { ServerNode, Endpoint } from '@matter/main';

import { config } from '../config.js';
import { loggers } from '../utils/logger.js';
import type { TrainStatusDevice, StatusChangeEvent } from '../devices/TrainStatusDevice.js';
import { MODE_TO_STATUS, deriveModeFromDelay } from '../domain/modeMapping.js';

import { TrainTemperatureServer } from './behaviors/TrainTemperatureServer.js';
import { TrainStatusModeServer } from './behaviors/TrainStatusModeServer.js';
import { TrainStatusAirQualityServer } from './behaviors/TrainStatusAirQualityServer.js';
import { printCommissioningInfo } from './helpers/commissioningHelpers.js';
import { ensureAggregatorRoot } from './helpers/bridgeSetup.js';
import { createServerNode } from './helpers/serverNodeFactory.js';
import { makeBridgedInfoBehavior, setEndpointName } from './helpers/matterHelpers.js';
import { createEndpoints } from './helpers/endpointFactory.js';

/**
 * Matter Server Implementation (v0.15 API)
 * Creates a discoverable Matter device that Google Home can commission
 */

export interface MatterServerResult {
  node: ServerNode;
  tempSensor: Endpoint;
  modeDevice?: Endpoint;
  airQualityDevice?: Endpoint;
  close: () => Promise<void>;
}

const log = loggers.matter;

function makeUniqueId(suffix: string): string {
  const base = `${config.matter.serialNumber}-${suffix}`;
  const hash = createHash('sha256').update(base).digest('hex');
  // UniqueId must be 32 chars; take first 32 hex chars
  return hash.slice(0, 32);
}

// Use helper to generate BD-BI behaviors

const BridgedInfoTemp = makeBridgedInfoBehavior({
  productName: config.matter.delayDeviceName ?? 'Train Delay',
  nodeLabel: config.matter.delayDeviceName ?? 'Train Delay',
  uniqueIdFactory: () => makeUniqueId('TEMP'),
});

const BridgedInfoMode = makeBridgedInfoBehavior({
  productName: config.matter.statusDeviceName ?? 'Train Status',
  nodeLabel: config.matter.statusDeviceName ?? 'Train Status',
  uniqueIdFactory: () => makeUniqueId('MODE'),
});

const BridgedInfoAirQuality = makeBridgedInfoBehavior({
  productName: config.matter.airQualityDeviceName ?? 'Train Air Quality',
  nodeLabel: config.matter.airQualityDeviceName ?? 'Train Air Quality',
  uniqueIdFactory: () => makeUniqueId('AIR'),
});

/**
 * Initialize and start the Matter server with train status device
 */
export async function startMatterServer(
  trainDevice: TrainStatusDevice
): Promise<MatterServerResult> {
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
    `📝 Adding endpoints: temperature "${config.matter.delayDeviceName}", mode "${config.matter.statusDeviceName}", air quality "${config.matter.airQualityDeviceName}"`
  );
  const tempBehaviors: unknown[] = [TrainTemperatureServer, UserLabelServer, FixedLabelServer];
  const modeBehaviors: unknown[] = [TrainStatusModeServer, UserLabelServer, FixedLabelServer];
  const airQualityBehaviors: unknown[] = [
    TrainStatusAirQualityServer,
    UserLabelServer,
    FixedLabelServer,
  ];
  if (config.matter.useBridge) {
    tempBehaviors.push(BridgedInfoTemp);
    modeBehaviors.push(BridgedInfoMode);
    airQualityBehaviors.push(BridgedInfoAirQuality);
  }

  // When not using a bridge, we only want one primary
  // visualisation endpoint exposed to controllers. Temperature
  // is always created; choose between mode and air quality.
  const primaryEndpoint = config.matter.primaryEndpoint;

  let tempSensor: Endpoint;
  let modeDevice: Endpoint | undefined;
  let airQualityDevice: Endpoint | undefined;
  const endpointOptions: {
    tempBehaviors: unknown[];
    modeBehaviors?: unknown[];
    airQualityBehaviors?: unknown[];
  } = { tempBehaviors };
  if (config.matter.useBridge || primaryEndpoint === 'mode') {
    endpointOptions.modeBehaviors = modeBehaviors;
  }
  if (config.matter.useBridge || primaryEndpoint === 'airQuality') {
    endpointOptions.airQualityBehaviors = airQualityBehaviors;
  }

  try {
    const endpoints = await createEndpoints(node, endpointOptions);
    tempSensor = endpoints.tempSensor;
    modeDevice = endpoints.modeDevice;
    airQualityDevice = endpoints.airQualityDevice;
    log.info('   ✓ Endpoints added');
  } catch (e) {
    const error = e as Error;
    log.error('   ❌ Failed adding endpoints');
    log.error(error?.stack || error);
    throw error;
  }

  // Display commissioning QR code
  printCommissioningInfo(node, log, config);

  // Connect the train device to update endpoints
  if (trainDevice) {
    log.info('🔗 Connecting train device to Matter endpoints...');

    // Set friendly labels; BD-BI already initialized with names when bridged
    try {
      if (tempSensor) {
        await setEndpointName(tempSensor, config.matter.delayDeviceName ?? 'Train Delay');
      }
      if (modeDevice) {
        await setEndpointName(modeDevice, config.matter.statusDeviceName ?? 'Train Status');
      }
      if (airQualityDevice) {
        await setEndpointName(
          airQualityDevice,
          config.matter.airQualityDeviceName ?? 'Train Air Quality'
        );
      }
      log.info('   ✓ Endpoint labels set');
    } catch (e) {
      const error = e as Error;
      log.warn(`⚠️ Could not set endpoint labels: ${error.message}`);
    }

    trainDevice.on('statusChange', async (status: StatusChangeEvent) => {
      log.debug(`Train status changed: ${JSON.stringify(status)}`);
      try {
        // Derive mode from delay when available; otherwise use currentMode or unknown
        let computedMode = deriveModeFromDelay(status?.delayMinutes);
        // Fallback to provided currentMode if derivation failed (e.g., non-numeric)
        if (Number.isNaN(Number(status?.delayMinutes)) && typeof status?.currentMode === 'number') {
          computedMode = status.currentMode;
        }

        const statusCode = MODE_TO_STATUS[computedMode] || 'unknown';

        // Update mode device if present
        if (modeDevice) {
          await modeDevice.act(async (agent) => {
            await (agent as any).modeSelect.setTrainStatus(statusCode);
          });
        }

        // Update temperature sensor from delay minutes (nullable supported)
        // Special case: if status is unknown and no train selected, use 999°C sentinel
        if (tempSensor) {
          await tempSensor.act(async (agent) => {
            const typedAgent = agent as any;
            if (statusCode === 'unknown' && status?.selectedService === null) {
              await typedAgent.temperatureMeasurement.setNoServiceTemperature();
            } else {
              await typedAgent.temperatureMeasurement.setDelayMinutes(status?.delayMinutes ?? null);
            }
          });
        }

        // Update air quality device with color-coded status if present
        if (airQualityDevice) {
          await airQualityDevice.act(async (agent) => {
            await (agent as any).airQuality.setTrainStatus(statusCode);
          });
        }
      } catch (error) {
        const err = error as Error;
        log.error(`Error updating Matter endpoints: ${err.message}`);
      }
    });

    log.info('   ✓ Train device event listeners attached');
  }

  // Start the server
  log.info('🚀 Starting Matter server...');
  await node.run();

  log.info('✅ Matter server running and discoverable');
  log.info(`   Listening on port: ${(config.matter as any).port ?? 5540}`);
  log.info('   Ready for commissioning with Google Home');

  return {
    node,
    tempSensor,
    modeDevice,
    airQualityDevice,
    close: async (): Promise<void> => {
      log.info('🛑 Shutting down Matter server...');
      await node.close();
      log.info('✅ Matter server shut down');
    },
  };
}
