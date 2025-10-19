import { config, isTestEnv, isProductionEnv } from '../src/config.js';

describe('Configuration', () => {
  test('config object has all required properties', () => {
    expect(config).toHaveProperty('rtt');
    expect(config).toHaveProperty('train');
    expect(config).toHaveProperty('server');
    expect(config).toHaveProperty('googleHome');
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

  test('googleHome config has device details', () => {
    expect(config.googleHome.agentUserId).toBe('user-123');
    expect(config.googleHome.deviceId).toBe('train_1');
    expect(config.googleHome.deviceName).toBe('My Train');
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
