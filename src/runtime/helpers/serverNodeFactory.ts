import { Environment, ServerNode } from '@matter/main';
// @ts-ignore - jest/ts-jest has issues resolving @matter/nodejs package exports
import { StorageBackendDisk } from '@matter/nodejs';
// @ts-ignore - jest/ts-jest has issues resolving @matter/main package exports
import { ModeSelectDevice } from '@matter/main/devices/mode-select';

import type { Config } from '../../config.js';

export interface ServerNodeResult {
  environment: Environment;
  node: ServerNode;
}

export async function createServerNode(
  config: Config,
  storagePath: string = '.matter-storage'
): Promise<ServerNodeResult> {
  const environment = Environment.default;
  environment.vars.set('storage.path', storagePath);
  environment.set(StorageBackendDisk, new StorageBackendDisk(storagePath));

  // Type assertion for Matter configuration with optional properties
  const matterConfig = config.matter as typeof config.matter & {
    port?: number;
    vendorId?: number;
    productId?: number;
  };

  const node = await ServerNode.create({
    id: 'rtt-checker',
    network: {
      port: matterConfig.port ?? 5540,
    },
    commissioning: {
      passcode: matterConfig.passcode,
      discriminator: matterConfig.discriminator,
    },
    productDescription: {
      name: matterConfig.useBridge ? matterConfig.productName : matterConfig.statusDeviceName,
      deviceType: matterConfig.useBridge ? 0x000e /* Aggregator */ : ModeSelectDevice.deviceType,
    },
    basicInformation: {
      vendorName: matterConfig.vendorName,
      vendorId: matterConfig.vendorId ?? 0xfff1,
      nodeLabel: matterConfig.statusDeviceName,
      productName: matterConfig.productName,
      productLabel: matterConfig.productName,
      productId: matterConfig.productId ?? 0x8001,
      serialNumber: matterConfig.serialNumber,
      hardwareVersion: 1,
      hardwareVersionString: '1.0',
      softwareVersion: 1,
      softwareVersionString: '1.0',
    },
  });

  return { environment, node };
}
