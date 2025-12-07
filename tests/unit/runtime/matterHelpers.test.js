import { describe, it, expect } from '@jest/globals';

import {
  setEndpointName,
  makeBridgedInfoBehavior,
  addEndpoint,
} from '../../../src/runtime/helpers/matterHelpers.js';

function makeEndpointMock() {
  const calls = { userLabel: null, fixedLabel: null };
  return {
    act: async (fn) => {
      await fn({
        userLabel: { setLabelList: async (list) => (calls.userLabel = list) },
        fixedLabel: { setLabelList: async (list) => (calls.fixedLabel = list) },
      });
    },
    calls,
  };
}

describe('matterHelpers', () => {
  describe('setEndpointName()', () => {
    it('should set both UserLabel and FixedLabel', async () => {
      const ep = makeEndpointMock();
      await setEndpointName(ep, 'Nice Name');
      expect(ep.calls.userLabel).toEqual([{ label: 'Name', value: 'Nice Name' }]);
      expect(ep.calls.fixedLabel).toEqual([{ label: 'Name', value: 'Nice Name' }]);
    });

    it('should handle different name values', async () => {
      const ep = makeEndpointMock();
      await setEndpointName(ep, 'Temperature Sensor');
      expect(ep.calls.userLabel).toEqual([{ label: 'Name', value: 'Temperature Sensor' }]);
      expect(ep.calls.fixedLabel).toEqual([{ label: 'Name', value: 'Temperature Sensor' }]);
    });

    it('should handle empty name', async () => {
      const ep = makeEndpointMock();
      await setEndpointName(ep, '');
      expect(ep.calls.userLabel).toEqual([{ label: 'Name', value: '' }]);
      expect(ep.calls.fixedLabel).toEqual([{ label: 'Name', value: '' }]);
    });

    it('should handle missing userLabel gracefully', async () => {
      const ep = {
        act: async (fn) => {
          await fn({
            userLabel: null, // Missing userLabel
            fixedLabel: { setLabelList: async (list) => (ep.fixedLabelCalls = list) },
          });
        },
        fixedLabelCalls: null,
      };
      await setEndpointName(ep, 'Test Name');
      expect(ep.fixedLabelCalls).toEqual([{ label: 'Name', value: 'Test Name' }]);
    });

    it('should handle missing fixedLabel gracefully', async () => {
      const ep = {
        act: async (fn) => {
          await fn({
            userLabel: { setLabelList: async (list) => (ep.userLabelCalls = list) },
            fixedLabel: null, // Missing fixedLabel
          });
        },
        userLabelCalls: null,
      };
      await setEndpointName(ep, 'Test Name');
      expect(ep.userLabelCalls).toEqual([{ label: 'Name', value: 'Test Name' }]);
    });
  });

  describe('makeBridgedInfoBehavior()', () => {
    it('should create a behavior class with factory pattern', () => {
      const BehaviorClass = makeBridgedInfoBehavior({
        productName: 'Test Product',
        nodeLabel: 'Test Node',
        uniqueIdFactory: () => 'test-unique-id',
      });

      expect(BehaviorClass).toBeDefined();
      expect(typeof BehaviorClass).toBe('function');
    });

    it('should create different behaviors with different config', () => {
      const Behavior1 = makeBridgedInfoBehavior({
        productName: 'Product 1',
        nodeLabel: 'Node 1',
        uniqueIdFactory: () => 'id-1',
      });

      const Behavior2 = makeBridgedInfoBehavior({
        productName: 'Product 2',
        nodeLabel: 'Node 2',
        uniqueIdFactory: () => 'id-2',
      });

      expect(Behavior1).not.toBe(Behavior2);
    });

    it('should handle uniqueIdFactory function', () => {
      let counter = 0;
      const BehaviorClass = makeBridgedInfoBehavior({
        productName: 'Test',
        nodeLabel: 'Test',
        uniqueIdFactory: () => `id-${++counter}`,
      });

      expect(BehaviorClass).toBeDefined();
    });
  });

  describe('addEndpoint()', () => {
    it('should call node.add with correct parameters', async () => {
      const mockDeviceDef = {
        with: (...behaviors) => ({
          deviceType: 'test',
          behaviors,
        }),
      };

      const mockNode = {
        add: async (deviceWithBehaviors, options) => {
          return { deviceWithBehaviors, options };
        },
      };

      const behaviors = ['Behavior1', 'Behavior2'];
      const result = await addEndpoint(mockNode, mockDeviceDef, behaviors, {
        id: 'test-id',
        number: 1,
      });

      expect(result.deviceWithBehaviors.deviceType).toBe('test');
      expect(result.deviceWithBehaviors.behaviors).toEqual(behaviors);
      expect(result.options).toEqual({ id: 'test-id', number: 1 });
    });

    it('should handle empty behaviors array', async () => {
      const mockDeviceDef = {
        with: (...behaviors) => ({ behaviors }),
      };

      const mockNode = {
        add: async (deviceWithBehaviors) => deviceWithBehaviors,
      };

      const result = await addEndpoint(mockNode, mockDeviceDef, [], { id: 'test', number: 1 });
      expect(result.behaviors).toEqual([]);
    });

    it('should preserve id and number in options', async () => {
      const mockDeviceDef = {
        with: () => ({ type: 'device' }),
      };

      const captured = {};
      const mockNode = {
        add: async (device, options) => {
          captured.options = options;
          return device;
        },
      };

      await addEndpoint(mockNode, mockDeviceDef, [], { id: 'my-endpoint', number: 42 });
      expect(captured.options).toEqual({ id: 'my-endpoint', number: 42 });
    });
  });
});
