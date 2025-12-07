import { DescriptorServer } from '@matter/main/behaviors/descriptor';
import type { ServerNode } from '@matter/main';

import type { Logger } from '../../utils/retryableRequest.js';

export async function ensureAggregatorRoot(node: ServerNode, log: Logger): Promise<void> {
  await node.act(async (agent) => {
    const descriptor = await agent.load(DescriptorServer);
    if (!descriptor.hasDeviceType(0x000e as any)) {
      descriptor.addDeviceTypes('Aggregator');
      log.info?.('   ✓ Root marked as Aggregator device type');
    }
  });
}
