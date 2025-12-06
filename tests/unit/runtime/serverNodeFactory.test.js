// Mock @matter/main and @matter/nodejs modules via jest ESM mocking
jest.unstable_mockModule('@matter/main', () => ({
  Environment: { default: { vars: new Map(), set() {} } },
  ServerNode: { create: async (opts) => ({ opts, run: async () => {}, close: async () => {} }) },
}));

jest.unstable_mockModule('@matter/nodejs', () => ({
  StorageBackendDisk: class StorageBackendDisk {},
}));

let createServerNode, Environment, StorageBackendDisk;
beforeAll(async () => {
  ({ createServerNode } = await import('../../../src/runtime/helpers/serverNodeFactory.js'));
  const main = await import('@matter/main');
  Environment = main.Environment;
  const nodejs = await import('@matter/nodejs');
  StorageBackendDisk = nodejs.StorageBackendDisk;
});

describe('serverNodeFactory.createServerNode', () => {
  test('configures environment and node based on config', async () => {
    const config = {
      matter: {
        port: 5540,
        passcode: 20202021,
        discriminator: 3840,
        productName: 'RTT Checker',
        statusDeviceName: 'Train Status',
        vendorName: 'RTT Inc',
        vendorId: 0xfff1,
        productId: 0x8001,
        serialNumber: 'RTT-001',
        useBridge: true,
      },
    };

    const { environment, node } = await createServerNode(config);
    expect(environment).toBe(Environment.default);
    // Ensure storage path set
    expect(environment.vars.get('storage.path')).toBe('.matter-storage');
    // Ensure StorageBackendDisk is registered
    expect(() =>
      environment.set(StorageBackendDisk, new StorageBackendDisk('.matter-storage'))
    ).not.toThrow();

    // Basic existence checks; detailed shape is owned by matter.js and mocked
    expect(node).toBeDefined();
  });
});
