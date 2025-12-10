import { UserLabelServer } from '@matter/main/behaviors/user-label';
import { FixedLabelServer } from '@matter/main/behaviors/fixed-label';
import type { ServerNode, Endpoint } from '@matter/main';

import { config } from '../config.js';
import { loggers } from '../utils/logger.js';
import type { TrainStatusDevice, StatusChangeEvent } from '../devices/TrainStatusDevice.js';

import { TrainTemperatureServer } from './behaviors/TrainTemperatureServer.js';
import { TrainStatusModeServer } from './behaviors/TrainStatusModeServer.js';
import { TrainStatusAirQualityServer } from './behaviors/TrainStatusAirQualityServer.js';
import { printCommissioningInfo } from './helpers/commissioningHelpers.js';
import { ensureAggregatorRoot } from './helpers/bridgeSetup.js';
import { createServerNode } from './helpers/serverNodeFactory.js';
import { createEndpoints } from './helpers/endpointFactory.js';
import { createBridgedDeviceInfoBehaviors } from './helpers/bridgedDeviceInfo.js';
import { handleStatusChange, setEndpointLabels } from './helpers/eventHandlers.js';

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
    const { BridgedInfoTemp, BridgedInfoMode, BridgedInfoAirQuality } =
      createBridgedDeviceInfoBehaviors(config);
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
    await setEndpointLabels(
      { tempSensor, modeDevice, airQualityDevice },
      {
        delayDeviceName: config.matter.delayDeviceName,
        statusDeviceName: config.matter.statusDeviceName,
        airQualityDeviceName: config.matter.airQualityDeviceName,
      }
    );

    trainDevice.on('statusChange', async (status: StatusChangeEvent) => {
      await handleStatusChange(status, { tempSensor, modeDevice, airQualityDevice });
    });

    log.info('   ✓ Train device event listeners attached');
  }

  // Start the server (non-blocking - node.run() starts in background)
  log.info('🚀 Starting Matter server...');
  node.run().catch((err: Error) => {
    log.error(`Matter server runtime error: ${err.message}`);
  });

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
