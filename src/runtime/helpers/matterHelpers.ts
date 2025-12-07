// @ts-ignore - jest/ts-jest has issues resolving @matter/main package exports
import { BridgedDeviceBasicInformationServer } from '@matter/main/behaviors/bridged-device-basic-information';
import type { ServerNode, Endpoint } from '@matter/main';
import type { Environment } from '@matter/main';

export interface BridgedInfoBehaviorConfig {
  productName: string;
  nodeLabel: string;
  uniqueIdFactory: () => string;
}

// Factory to create a BD-BI behavior with configured names and IDs
export function makeBridgedInfoBehavior({
  productName,
  nodeLabel,
  uniqueIdFactory,
}: BridgedInfoBehaviorConfig): typeof BridgedDeviceBasicInformationServer {
  return class BridgedInfoBehavior extends BridgedDeviceBasicInformationServer {
    // Note: 'override' keyword required by tsc but jest/ts-jest doesn't see the parent class correctly
    override async initialize() {
      const state = (this as any).state;
      const env = (this as any).env as Environment;
      state.vendorName = env.vars.get('matter.vendorName') ?? 'RTT Checker';
      state.vendorId = 0xfff1; // default vendor if not provided via env
      state.productName = productName;
      state.productId = 0x8001;
      state.productLabel = productName;
      state.nodeLabel = nodeLabel;
      state.reachable = true;
      state.serialNumber = env.vars.get('matter.serialNumber') ?? 'RTT-001';
      state.manufacturingDate = '2024-01-01';
      state.productAppearance = { finish: 0, primaryColor: 0 };
      state.uniqueId = uniqueIdFactory();
      state.hardwareVersion = 1;
      state.hardwareVersionString = '1.0';
      state.softwareVersion = 1;
      state.softwareVersionString = '1.0';
      await super.initialize?.();
    }
  };
}

// Helper for endpoint creation with explicit id/number
export async function addEndpoint<T extends { with: (...behaviors: any[]) => any }>(
  node: ServerNode,
  deviceDef: T,
  behaviors: unknown[],
  { id, number }: { id: string; number: number }
): Promise<Endpoint> {
  return (node as any).add(deviceDef.with(...behaviors), { id, number });
}

// Helper to set both UserLabel and FixedLabel to a single Name value
export async function setEndpointName(endpoint: Endpoint, name: string): Promise<void> {
  await endpoint.act(async (agent) => {
    const typedAgent = agent as any;
    if (typedAgent.userLabel?.setLabelList) {
      await typedAgent.userLabel.setLabelList([{ label: 'Name', value: name }]);
    }
    if (typedAgent.fixedLabel?.setLabelList) {
      await typedAgent.fixedLabel.setLabelList([{ label: 'Name', value: name }]);
    }
  });
}
