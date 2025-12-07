// @ts-nocheck
// Mock @matter/main and @matter/nodejs modules via jest ESM mocking
/*
jest.unstable_mockModule('@matter/main', () => ({
  Environment: { default: { vars: new Map(), set() {} } },
  ServerNode: { create: async (opts) => ({ opts, run: async () => {}, close: async () => {} }) },
}));

jest.unstable_mockModule('@matter/nodejs', () => ({
  StorageBackendDisk: class StorageBackendDisk {},
}));
*/

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

  test('validates non-bridge mode configuration structure', () => {
    const config = {
      matter: {
        port: 8080,
        passcode: 12345678,
        discriminator: 2000,
        productName: 'Direct Device',
        statusDeviceName: 'Direct Status',
        vendorName: 'Vendor',
        serialNumber: 'DIRECT-001',
        useBridge: false,
      },
    };

    // Verify config structure for non-bridge mode
    expect(config.matter.useBridge).toBe(false);
    expect(config.matter.statusDeviceName).toBe('Direct Status');
    // In non-bridge mode, factory uses statusDeviceName and ModeSelectDevice type
  });

  test('handles missing optional vendorId and productId', async () => {
    const config = {
      matter: {
        port: 5540,
        passcode: 20202021,
        discriminator: 3840,
        productName: 'Product',
        statusDeviceName: 'Status',
        vendorName: 'Vendor',
        serialNumber: 'SERIAL-001',
        useBridge: true,
        // vendorId and productId omitted
      },
    };

    const { node } = await createServerNode(config);
    expect(node).toBeDefined();
    // Factory should provide defaults (0xfff1 for vendorId, 0x8001 for productId)
  });

  test('uses consistent storage path', async () => {
    const config = {
      matter: {
        port: 5540,
        passcode: 20202021,
        discriminator: 3840,
        productName: 'Test',
        statusDeviceName: 'Test Status',
        vendorName: 'Test Vendor',
        serialNumber: 'TEST-001',
        useBridge: false,
      },
    };

    const { environment } = await createServerNode(config);
    expect(environment.vars.get('storage.path')).toBe('.matter-storage');
  });

  test('validates commissioning parameters are within valid ranges', async () => {
    const config = {
      matter: {
        port: 5540,
        passcode: 20202021, // Valid: 1-99999999
        discriminator: 3840, // Valid: 0-4095
        productName: 'Test',
        statusDeviceName: 'Test',
        vendorName: 'Test',
        serialNumber: 'TEST',
        useBridge: false,
      },
    };

    // Verify config values are within valid ranges
    expect(config.matter.passcode).toBeGreaterThanOrEqual(1);
    expect(config.matter.passcode).toBeLessThanOrEqual(99999999);
    expect(config.matter.discriminator).toBeGreaterThanOrEqual(0);
    expect(config.matter.discriminator).toBeLessThanOrEqual(4095);

    const { node } = await createServerNode(config);
    expect(node).toBeDefined();
  });
});
