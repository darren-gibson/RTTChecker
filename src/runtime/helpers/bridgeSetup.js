import { DescriptorServer } from '@matter/main/behaviors/descriptor';

export async function ensureAggregatorRoot(node, log) {
  await node.act(async (agent) => {
    const descriptor = await agent.load(DescriptorServer);
    if (!descriptor.hasDeviceType(0x000e)) {
      descriptor.addDeviceTypes('Aggregator');
      log.info('   ✓ Root marked as Aggregator device type');
    }
  });
}
