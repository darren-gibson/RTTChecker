import { createHash } from 'crypto';

import { makeBridgedInfoBehavior } from './matterHelpers.js';
import type { Config } from '../../config/configTypes.js';

/**
 * Generate a unique 32-character ID for a bridged device.
 */
function makeUniqueId(serialNumber: string, suffix: string): string {
  const base = `${serialNumber}-${suffix}`;
  const hash = createHash('sha256').update(base).digest('hex');
  // UniqueId must be 32 chars; take first 32 hex chars
  return hash.slice(0, 32);
}

/**
 * Create bridged device info behaviors for all three endpoint types.
 *
 * These behaviors provide device identification for bridged Matter devices.
 */
export function createBridgedDeviceInfoBehaviors(config: Config) {
  const BridgedInfoTemp = makeBridgedInfoBehavior({
    productName: config.matter.delayDeviceName ?? 'Train Delay',
    nodeLabel: config.matter.delayDeviceName ?? 'Train Delay',
    uniqueIdFactory: () => makeUniqueId(config.matter.serialNumber, 'TEMP'),
  });

  const BridgedInfoMode = makeBridgedInfoBehavior({
    productName: config.matter.statusDeviceName ?? 'Train Status',
    nodeLabel: config.matter.statusDeviceName ?? 'Train Status',
    uniqueIdFactory: () => makeUniqueId(config.matter.serialNumber, 'MODE'),
  });

  const BridgedInfoAirQuality = makeBridgedInfoBehavior({
    productName: config.matter.airQualityDeviceName ?? 'Train Air Quality',
    nodeLabel: config.matter.airQualityDeviceName ?? 'Train Air Quality',
    uniqueIdFactory: () => makeUniqueId(config.matter.serialNumber, 'AIR'),
  });

  return {
    BridgedInfoTemp,
    BridgedInfoMode,
    BridgedInfoAirQuality,
  };
}
