import { TrainStatusDevice } from '../../../src/MatterDevice.js';
import { TrainStatus, MatterDevice } from '../../../src/constants.js';
import { getTrainStatus } from '../../../src/RTTBridge.js';
import { fixtures, clone } from '../../fixtures/services.js';

jest.mock('../../../src/RTTBridge.js');

describe('TrainStatusDevice - core', () => {
  let device;

  beforeEach(() => {
    device = new TrainStatusDevice();
    jest.clearAllMocks();
  });

  afterEach(() => {
    device.stopPeriodicUpdates();
  });

  test('initializes with unknown mode', () => {
    expect(device.getCurrentMode()).toBe(MatterDevice.Modes.UNKNOWN.mode);
  });

  test('returns all supported modes', () => {
    const modes = device.getSupportedModes();
    expect(modes).toHaveLength(5);
    expect(modes).toContainEqual(MatterDevice.Modes.ON_TIME);
    expect(modes).toContainEqual(MatterDevice.Modes.MINOR_DELAY);
    expect(modes).toContainEqual(MatterDevice.Modes.DELAYED);
    expect(modes).toContainEqual(MatterDevice.Modes.MAJOR_DELAY);
    expect(modes).toContainEqual(MatterDevice.Modes.UNKNOWN);
  });

  test('returns device info with Matter constants', () => {
    const info = device.getDeviceInfo();
    expect(info.vendorId).toBe(MatterDevice.VendorId);
    expect(info.productId).toBe(MatterDevice.ProductId);
    expect(info.deviceType).toBe(MatterDevice.DeviceType);
    expect(info.deviceName).toBe('Train Status');
    expect(info.vendorName).toBe('RTT Checker');
    expect(info.productName).toBe('Train Status Monitor');
    expect(info.serialNumber).toBe('RTT-001');
  });

  describe('updateTrainStatus', () => {
    test('updates mode to ON_TIME when train is on time', async () => {
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.ON_TIME,
        selected: clone(fixtures.onTime),
        raw: {}
      });

      await device.updateTrainStatus();
      expect(device.getCurrentMode()).toBe(MatterDevice.Modes.ON_TIME.mode);
    });

    test('updates mode to MINOR_DELAY when train is slightly late', async () => {
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.MINOR_DELAY,
        selected: clone(fixtures.minorDelay),
        raw: {}
      });

      await device.updateTrainStatus();
      expect(device.getCurrentMode()).toBe(MatterDevice.Modes.MINOR_DELAY.mode);
    });

    test('updates mode to DELAYED when train is moderately late', async () => {
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.DELAYED,
        selected: clone(fixtures.delayed),
        raw: {}
      });

      await device.updateTrainStatus();
      expect(device.getCurrentMode()).toBe(MatterDevice.Modes.DELAYED.mode);
    });

    test('updates mode to MAJOR_DELAY when train is very late or cancelled', async () => {
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.MAJOR_DELAY,
        selected: clone(fixtures.majorDelay),
        raw: {}
      });

      await device.updateTrainStatus();
      expect(device.getCurrentMode()).toBe(MatterDevice.Modes.MAJOR_DELAY.mode);
    });

    test('updates mode to UNKNOWN when no train found', async () => {
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.UNKNOWN,
        selected: null,
        raw: {}
      });

      await device.updateTrainStatus();
      expect(device.getCurrentMode()).toBe(MatterDevice.Modes.UNKNOWN.mode);
    });

    test('sets mode to UNKNOWN on error', async () => {
      getTrainStatus.mockRejectedValue(new Error('API error'));

      await expect(device.updateTrainStatus()).rejects.toThrow('API error');
      expect(device.getCurrentMode()).toBe(MatterDevice.Modes.UNKNOWN.mode);
    });

    test('does not change mode if status unchanged', async () => {
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.ON_TIME,
        selected: clone(fixtures.onTime),
        raw: {}
      });

      await device.updateTrainStatus();
      const firstMode = device.getCurrentMode();

      await device.updateTrainStatus();
      const secondMode = device.getCurrentMode();

      expect(firstMode).toBe(secondMode);
      expect(firstMode).toBe(MatterDevice.Modes.ON_TIME.mode);
    });
  });
});
