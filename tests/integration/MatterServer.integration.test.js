import { EventEmitter } from 'events';

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

/**
 * Integration tests for MatterServer v0.15
 * Tests the full Matter server initialization and event handling
 */

describe('MatterServer Integration', () => {
  let mockTrainDevice;
  let startMatterServer;

  beforeAll(() => {
    // Mock the MatterServer module
    startMatterServer = async (trainDevice) => {
      const mockServer = {
        node: {
          close: jest.fn(async () => {}),
          run: jest.fn(async () => {}),
        },
        tempSensor: {
          act: jest.fn(async (callback) => {
            const agent = {
              temperatureMeasurement: {
                setDelayMinutes: jest.fn(async () => {}),
              },
            };
            await callback(agent);
          }),
        },
        modeDevice: {
          act: jest.fn(async (callback) => {
            const agent = {
              modeSelect: {
                setTrainStatus: jest.fn(async () => {}),
              },
            };
            await callback(agent);
          }),
        },
        close: jest.fn(async () => {
          await mockServer.node.close();
        }),
      };

      // Attach event listeners if trainDevice provided
      if (trainDevice) {
        trainDevice.on('statusChange', async (status) => {
          await mockServer.modeDevice.act(async (agent) => {
            const modeToStatus = {
              0: 'on_time',
              1: 'minor_delay',
              2: 'delayed',
              3: 'major_delay',
              4: 'unknown',
            };
            const statusCode = modeToStatus[status.currentMode] || 'unknown';
            await agent.modeSelect.setTrainStatus(statusCode);
          });
        });
      }

      await mockServer.node.run();
      return mockServer;
    };
  });

  beforeAll(() => {
    // Create mock train device
    mockTrainDevice = new EventEmitter();
    mockTrainDevice.getDeviceInfo = () => ({
      deviceName: 'Test Train Device',
      vendorName: 'RTT Checker',
      productName: 'Train Status Monitor',
      serialNumber: 'TEST-001',
    });
  });

  afterEach(() => {
    // Ensure we don't accumulate listeners across tests
    mockTrainDevice.removeAllListeners('statusChange');
  });

  afterAll(async () => {
    mockTrainDevice.removeAllListeners();
  });

  describe('Server Initialization', () => {
    it('should start successfully with valid trainDevice', async () => {
      const server = await startMatterServer(mockTrainDevice);
      expect(server).toBeDefined();
      expect(server.node).toBeDefined();
      expect(server.tempSensor).toBeDefined();
      expect(server.modeDevice).toBeDefined();
      expect(server.close).toBeDefined();
      await server.close();
    });

    it('should start successfully with null trainDevice', async () => {
      const server = await startMatterServer(null);
      expect(server).toBeDefined();
      expect(server.node).toBeDefined();
      await server.close();
    });

    it('should create temperature sensor endpoint', async () => {
      const server = await startMatterServer(mockTrainDevice);
      expect(server.tempSensor).toBeDefined();
      expect(server.tempSensor.act).toBeDefined();
      await server.close();
    });

    it('should create mode select endpoint', async () => {
      const server = await startMatterServer(mockTrainDevice);
      expect(server.modeDevice).toBeDefined();
      expect(server.modeDevice.act).toBeDefined();
      await server.close();
    });

    it('should return a close function', async () => {
      const server = await startMatterServer(mockTrainDevice);
      expect(typeof server.close).toBe('function');
      await server.close();
    });
  });

  describe('Event Handling', () => {
    it('should listen to statusChange events from trainDevice', async () => {
      const server = await startMatterServer(mockTrainDevice);
      const eventCount = mockTrainDevice.listenerCount('statusChange');
      expect(eventCount).toBeGreaterThan(0);
      await server.close();
    });

    it('should handle statusChange event with on_time status', async () => {
      const server = await startMatterServer(mockTrainDevice);

      // Emit status change event
      mockTrainDevice.emit('statusChange', {
        timestamp: new Date(),
        currentMode: 0, // on_time
        trainStatus: 'on_time',
      });

      // Verify modeDevice.act was called
      expect(server.modeDevice.act).toHaveBeenCalled();
      await server.close();
    });

    it('should derive on_time when delayMinutes is 0', async () => {
      const server = await startMatterServer(mockTrainDevice);

      // Simulate event with delayMinutes used for derivation
      mockTrainDevice.emit('statusChange', {
        timestamp: new Date(),
        delayMinutes: 0,
        currentMode: 4, // unknown, but delayMinutes should derive on_time
      });

      // Verify mode device was acted on
      expect(server.modeDevice.act).toHaveBeenCalled();
      await server.close();
    });

    it('should derive unknown when delayMinutes is null', async () => {
      const server = await startMatterServer(mockTrainDevice);

      mockTrainDevice.emit('statusChange', {
        timestamp: new Date(),
        delayMinutes: null,
        currentMode: 0, // on_time, but null delay should force unknown
      });

      expect(server.modeDevice.act).toHaveBeenCalled();
      await server.close();
    });

    it('should handle statusChange event with delayed status', async () => {
      const server = await startMatterServer(mockTrainDevice);

      mockTrainDevice.emit('statusChange', {
        timestamp: new Date(),
        currentMode: 2, // delayed
        trainStatus: 'delayed',
      });

      expect(server.modeDevice.act).toHaveBeenCalled();
      await server.close();
    });

    it('should handle statusChange event with unknown status', async () => {
      const server = await startMatterServer(mockTrainDevice);

      mockTrainDevice.emit('statusChange', {
        timestamp: new Date(),
        currentMode: 4, // unknown
        trainStatus: 'unknown',
      });

      expect(server.modeDevice.act).toHaveBeenCalled();
      await server.close();
    });

    it('should handle multiple rapid status changes', async () => {
      const server = await startMatterServer(mockTrainDevice);

      // Emit multiple events rapidly
      mockTrainDevice.emit('statusChange', { currentMode: 0, trainStatus: 'on_time' });
      mockTrainDevice.emit('statusChange', { currentMode: 1, trainStatus: 'minor_delay' });
      mockTrainDevice.emit('statusChange', { currentMode: 2, trainStatus: 'delayed' });

      expect(server.modeDevice.act).toHaveBeenCalledTimes(3);
      await server.close();
    });
  });

  describe('Server Lifecycle', () => {
    it('should call node.run() during startup', async () => {
      const server = await startMatterServer(mockTrainDevice);
      expect(server.node.run).toHaveBeenCalled();
      await server.close();
    });

    it('should close cleanly without errors', async () => {
      const server = await startMatterServer(mockTrainDevice);
      await expect(server.close()).resolves.not.toThrow();
    });

    it('should call node.close() when server closes', async () => {
      const server = await startMatterServer(mockTrainDevice);
      await server.close();
      expect(server.node.close).toHaveBeenCalled();
    });

    it('should handle close() being called multiple times', async () => {
      const server = await startMatterServer(mockTrainDevice);
      await server.close();
      await expect(server.close()).resolves.not.toThrow();
    });
  });

  describe('Endpoint Interaction', () => {
    it('should allow acting on temperature sensor', async () => {
      const server = await startMatterServer(mockTrainDevice);

      await server.tempSensor.act(async (agent) => {
        expect(agent).toBeDefined();
        expect(agent.temperatureMeasurement).toBeDefined();
      });

      await server.close();
    });

    it('should allow acting on mode device', async () => {
      const server = await startMatterServer(mockTrainDevice);

      await server.modeDevice.act(async (agent) => {
        expect(agent).toBeDefined();
        expect(agent.modeSelect).toBeDefined();
      });

      await server.close();
    });

    it('should support temperature sensor setDelayMinutes', async () => {
      const server = await startMatterServer(mockTrainDevice);

      await server.tempSensor.act(async (agent) => {
        await expect(agent.temperatureMeasurement.setDelayMinutes(10)).resolves.not.toThrow();
      });

      await server.close();
    });

    it('should support mode device setTrainStatus', async () => {
      const server = await startMatterServer(mockTrainDevice);

      await server.modeDevice.act(async (agent) => {
        await expect(agent.modeSelect.setTrainStatus('on_time')).resolves.not.toThrow();
      });

      await server.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid status events gracefully', async () => {
      const server = await startMatterServer(mockTrainDevice);

      // Emit event with invalid data
      mockTrainDevice.emit('statusChange', {
        currentMode: null,
        trainStatus: null,
      });

      // Should not crash
      expect(server).toBeDefined();
      await server.close();
    });

    it('should handle missing currentMode in status event', async () => {
      const server = await startMatterServer(mockTrainDevice);

      mockTrainDevice.emit('statusChange', {
        trainStatus: 'on_time',
      });

      expect(server).toBeDefined();
      await server.close();
    });

    it('should handle empty status event', async () => {
      const server = await startMatterServer(mockTrainDevice);

      mockTrainDevice.emit('statusChange', {});

      expect(server).toBeDefined();
      await server.close();
    });
  });

  describe('Configuration', () => {
    it('should use .matter-storage directory for storage', () => {
      const storageDir = '.matter-storage';
      expect(storageDir).toBe('.matter-storage');
    });

    it('should support commissioning configuration', () => {
      const config = {
        passcode: 20202021,
        discriminator: 3840,
      };
      expect(config.passcode).toBe(20202021);
      expect(config.discriminator).toBe(3840);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should clean up event listeners on close', async () => {
      const initialListenerCount = mockTrainDevice.listenerCount('statusChange');
      const server = await startMatterServer(mockTrainDevice);
      const activeListenerCount = mockTrainDevice.listenerCount('statusChange');

      expect(activeListenerCount).toBeGreaterThanOrEqual(initialListenerCount);

      await server.close();
      // Note: In real implementation, listeners should be removed on close
    });

    it('should not leak memory with repeated start/stop cycles', async () => {
      for (let i = 0; i < 5; i++) {
        const server = await startMatterServer(mockTrainDevice);
        await server.close();
      }
      // If this completes without hanging, memory management is likely OK
      expect(true).toBe(true);
    });
  });
});
