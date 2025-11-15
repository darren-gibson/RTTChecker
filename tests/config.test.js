import { config, isTestEnv, isProductionEnv } from '../src/config.js';

describe('Configuration', () => {
  test('config object has all required properties', () => {
    expect(config).toHaveProperty('rtt');
    expect(config).toHaveProperty('train');
    expect(config).toHaveProperty('server');
    expect(config).toHaveProperty('matter');
  });

  test('rtt config has user and pass', () => {
    expect(config.rtt).toHaveProperty('user');
    expect(config.rtt).toHaveProperty('pass');
  });

  test('train config has default values', () => {
    expect(config.train.originTiploc).toBe('CAMBDGE');
    expect(config.train.destTiploc).toBe('KNGX');
    expect(config.train.minAfterMinutes).toBe(20);
    expect(config.train.windowMinutes).toBe(60);
  });

  test('server config has default port', () => {
    expect(config.server.port).toBe(8080);
  });

  test('matter config has device details', () => {
    expect(config.matter.deviceName).toBe('Train Status');
    expect(config.matter.vendorName).toBe('RTT Checker');
    expect(config.matter.productName).toBe('Train Status Monitor');
    expect(config.matter.serialNumber).toBe('RTT-001');
    expect(config.matter.discriminator).toBe(3840);
    expect(config.matter.passcode).toBe(20202021);
  });

  test('isTestEnv returns true in test environment', () => {
    // NODE_ENV is set to 'test' by Jest
    // Note: Currently not used in production code, but available for future use
    expect(isTestEnv()).toBe(true);
  });

  test('isProductionEnv returns false in test environment', () => {
    // Note: Currently not used in production code, but available for future use
    expect(isProductionEnv()).toBe(false);
  });
});
