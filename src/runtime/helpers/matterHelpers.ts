import { BridgedDeviceBasicInformationServer } from '@matter/main/behaviors/bridged-device-basic-information';
import type { ServerNode, Endpoint } from '@matter/main';
import type { DeviceTypeDefinition } from '@matter/main/types';

export interface BridgedInfoBehaviorConfig {
  productName: string;
  nodeLabel: string;
  uniqueIdFactory: () => string;
}

// Factory to create a BD-BI behavior with configured names and IDs
export function makeBridgedInfoBehavior({ productName, nodeLabel, uniqueIdFactory }: BridgedInfoBehaviorConfig): typeof BridgedDeviceBasicInformationServer {
  return class BridgedInfoBehavior extends BridgedDeviceBasicInformationServer {
    async initialize() {
      this.state.vendorName = this.env.vars.get('matter.vendorName') ?? 'RTT Checker';
      this.state.vendorId = 0xfff1; // default vendor if not provided via env
      this.state.productName = productName;
      this.state.productId = 0x8001;
      this.state.productLabel = productName;
      this.state.nodeLabel = nodeLabel;
      this.state.reachable = true;
      this.state.serialNumber = this.env.vars.get('matter.serialNumber') ?? 'RTT-001';
      this.state.manufacturingDate = '2024-01-01';
      this.state.productAppearance = { finish: 0, primaryColor: 0 };
      this.state.uniqueId = uniqueIdFactory();
      this.state.hardwareVersion = 1;
      this.state.hardwareVersionString = '1.0';
      this.state.softwareVersion = 1;
      this.state.softwareVersionString = '1.0';
      await super.initialize?.();
    }
  };
}

// Helper for endpoint creation with explicit id/number
export async function addEndpoint(
  node: ServerNode,
  deviceDef: DeviceTypeDefinition,
  behaviors: unknown[],
  { id, number }: { id: string; number: number }
): Promise<Endpoint> {
  return node.add(deviceDef.with(...behaviors), { id, number });
}

// Helper to set both UserLabel and FixedLabel to a single Name value
export async function setEndpointName(endpoint: Endpoint, name: string): Promise<void> {
  await endpoint.act(async (agent: any) => {
    if (agent.userLabel?.setLabelList) {
      await agent.userLabel.setLabelList([{ label: 'Name', value: name }]);
    }
    if (agent.fixedLabel?.setLabelList) {
      await agent.fixedLabel.setLabelList([{ label: 'Name', value: name }]);
    }
  });
}
