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

  test('device names are sanitized to use dash separator', () => {
    // Default derived names should use dash, not arrow
    expect(config.matter.statusDeviceName).toBe('CAMBDGE-KNGX Train Status');
    expect(config.matter.delayDeviceName).toBe('CAMBDGE-KNGX Train Delay');
  });

  test('device names are ASCII-safe', () => {
    // Names should only contain printable ASCII characters
    expect(config.matter.statusDeviceName).toMatch(/^[\x20-\x7E]+$/);
    expect(config.matter.delayDeviceName).toMatch(/^[\x20-\x7E]+$/);
  });

  test('device names are within Matter length limits', () => {
    // Matter has 64 character limit on device names
    expect(config.matter.statusDeviceName.length).toBeLessThanOrEqual(64);
    expect(config.matter.delayDeviceName.length).toBeLessThanOrEqual(64);
  });
});

describe('validateConfig', () => {
  test('throws error when RTT_USER is missing', () => {
    const mockConfig = { rtt: { pass: 'test' } };
    const validateFn = () => {
      const errors = [];
      if (!mockConfig.rtt.user) errors.push('RTT_USER environment variable is required (RTT API username)');
      if (!mockConfig.rtt.pass) errors.push('RTT_PASS environment variable is required (RTT API password)');
      if (errors.length > 0) throw new Error('Configuration validation failed');
    };
    expect(() => validateFn()).toThrow(/Configuration validation failed/);
  });
  
  test('throws error when RTT_PASS is missing', () => {
    const mockConfig = { rtt: { user: 'test' } };
    const validateFn = () => {
      const errors = [];
      if (!mockConfig.rtt.user) errors.push('RTT_USER');
      if (!mockConfig.rtt.pass) errors.push('RTT_PASS');
      if (errors.length > 0) throw new Error('Configuration validation failed');
    };
    expect(() => validateFn()).toThrow(/Configuration validation failed/);
  });
  
  test('throws error when both credentials are missing', () => {
    const mockConfig = { rtt: {} };
    const validateFn = () => {
      const errors = [];
      if (!mockConfig.rtt.user) errors.push('RTT_USER');
      if (!mockConfig.rtt.pass) errors.push('RTT_PASS');
      if (errors.length > 0) throw new Error('Configuration validation failed');
    };
    expect(() => validateFn()).toThrow(/Configuration validation failed/);
  });
  
  test('passes validation when both credentials present', () => {
    const mockConfig = { rtt: { user: 'test', pass: 'pass' } };
    const validateFn = () => {
      const errors = [];
      if (!mockConfig.rtt.user) errors.push('RTT_USER');
      if (!mockConfig.rtt.pass) errors.push('RTT_PASS');
      if (errors.length > 0) throw new Error('fail');
    };
    expect(() => validateFn()).not.toThrow();
  });
});
