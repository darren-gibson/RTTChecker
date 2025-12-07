import { Environment, ServerNode } from '@matter/main';
import { StorageBackendDisk } from '@matter/nodejs';
import { ModeSelectDevice } from '@matter/main/devices/mode-select';
import type { Config } from '../../config.js';

export interface ServerNodeResult {
  environment: Environment;
  node: ServerNode;
}

export async function createServerNode(config: Config): Promise<ServerNodeResult> {
  const environment = Environment.default;
  environment.vars.set('storage.path', '.matter-storage');
  environment.set(StorageBackendDisk, new StorageBackendDisk('.matter-storage'));

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
      vendorId: config.matter.vendorId ?? 0xfff1,
      nodeLabel: config.matter.statusDeviceName,
      productName: config.matter.productName,
      productLabel: config.matter.productName,
      productId: config.matter.productId ?? 0x8001,
      serialNumber: config.matter.serialNumber,
      hardwareVersion: 1,
      hardwareVersionString: '1.0',
      softwareVersion: 1,
      softwareVersionString: '1.0',
    },
  });

  return { environment, node };
}
