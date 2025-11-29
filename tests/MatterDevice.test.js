import { TrainStatusDevice } from '../src/MatterDevice.js';
import { TrainStatus, MatterDevice } from '../src/constants.js';
import { getTrainStatus } from '../src/RTTBridge.js';
import { RTTApiError, NoTrainFoundError, RTTCheckerError } from '../src/errors.js';

// Mock the RTTBridge module
jest.mock('../src/RTTBridge.js');

describe('TrainStatusDevice', () => {
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
        selected: { locationDetail: { gbttBookedDeparture: '0630' } },
        raw: {}
      });

      await device.updateTrainStatus();
      expect(device.getCurrentMode()).toBe(MatterDevice.Modes.ON_TIME.mode);
    });

    test('updates mode to MINOR_DELAY when train is slightly late', async () => {
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.MINOR_DELAY,
        selected: { locationDetail: { gbttBookedDeparture: '0630' } },
        raw: {}
      });

      await device.updateTrainStatus();
      expect(device.getCurrentMode()).toBe(MatterDevice.Modes.MINOR_DELAY.mode);
    });

    test('updates mode to DELAYED when train is moderately late', async () => {
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.DELAYED,
        selected: { locationDetail: { gbttBookedDeparture: '0630' } },
        raw: {}
      });

      await device.updateTrainStatus();
      expect(device.getCurrentMode()).toBe(MatterDevice.Modes.DELAYED.mode);
    });

    test('updates mode to MAJOR_DELAY when train is very late or cancelled', async () => {
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.MAJOR_DELAY,
        selected: { locationDetail: { gbttBookedDeparture: '0630', cancelReasonCode: 'M8' } },
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
        selected: { locationDetail: { gbttBookedDeparture: '0630' } },
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

  describe('periodic updates', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('startPeriodicUpdates calls updateTrainStatus immediately', async () => {
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.ON_TIME,
        selected: { locationDetail: { gbttBookedDeparture: '0630' } },
        raw: {}
      });

      device.startPeriodicUpdates();
      
      // Wait for promises to resolve
      await Promise.resolve();
      
      expect(getTrainStatus).toHaveBeenCalled();
    });

    test('startPeriodicUpdates sets up interval', async () => {
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.ON_TIME,
        selected: { locationDetail: { gbttBookedDeparture: '0630' } },
        raw: {}
      });

      const callCountBefore = getTrainStatus.mock.calls.length;
      device.startPeriodicUpdates();
      
      // Wait for immediate call
      await Promise.resolve();
      
      // Advance by update interval
      jest.advanceTimersByTime(60000);
      await Promise.resolve();
      
      // Should have been called at least once more after the interval
      expect(getTrainStatus.mock.calls.length).toBeGreaterThan(callCountBefore);
    });

    test('stopPeriodicUpdates clears interval', async () => {
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.ON_TIME,
        selected: { locationDetail: { gbttBookedDeparture: '0630' } },
        raw: {}
      });

      device.startPeriodicUpdates();
      await Promise.resolve();
      
      const callCountAfterStart = getTrainStatus.mock.calls.length;
      device.stopPeriodicUpdates();
      
      jest.advanceTimersByTime(120000);
      await Promise.resolve();
      
      // Should not be called again after stop
      expect(getTrainStatus.mock.calls.length).toBe(callCountAfterStart);
    });
  });

  describe('Enhanced error handling', () => {
    test('handles RTTApiError with isAuthError', async () => {
      const authError = new RTTApiError('Unauthorized', { statusCode: 401 });
      authError.isAuthError = () => true;
      authError.isRetryable = () => false;
      
      getTrainStatus.mockRejectedValue(authError);
      
      const device = new TrainStatusDevice();
      await expect(device.updateTrainStatus()).rejects.toThrow('Unauthorized');
      
      // Should emit statusChange with error
      expect(device.currentMode).toBe(4); // UNKNOWN
    });

    test('handles RTTApiError with isRetryable', async () => {
      const retryError = new RTTApiError('Service unavailable', { statusCode: 503 });
      retryError.isAuthError = () => false;
      retryError.isRetryable = () => true;
      
      getTrainStatus.mockRejectedValue(retryError);
      
      const device = new TrainStatusDevice();
      await expect(device.updateTrainStatus()).rejects.toThrow('Service unavailable');
      
      // Should emit statusChange with error
      expect(device.currentMode).toBe(4); // UNKNOWN
    });

    test('handles NoTrainFoundError', async () => {
      const noTrainError = new NoTrainFoundError('No trains at this time');
      
      getTrainStatus.mockRejectedValue(noTrainError);
      
      const device = new TrainStatusDevice();
      await expect(device.updateTrainStatus()).rejects.toThrow('No trains at this time');
      
      // Should emit statusChange with error
      expect(device.currentMode).toBe(4); // UNKNOWN
    });

    test('handles RTTCheckerError with context', async () => {
      const checkerError = new RTTCheckerError('Configuration error', { setting: 'ORIGIN_TIPLOC' });
      
      getTrainStatus.mockRejectedValue(checkerError);
      
      const device = new TrainStatusDevice();
      await expect(device.updateTrainStatus()).rejects.toThrow('Configuration error');
      
      // Should emit statusChange with error
      expect(device.currentMode).toBe(4); // UNKNOWN
    });

    test('handles generic errors', async () => {
      const genericError = new Error('Something unexpected');
      
      getTrainStatus.mockRejectedValue(genericError);
      
      const device = new TrainStatusDevice();
      await expect(device.updateTrainStatus()).rejects.toThrow('Something unexpected');
      
      // Should emit statusChange with error
      expect(device.currentMode).toBe(4); // UNKNOWN
    });

    test('emits statusChange event on error with previous mode', async () => {
      const device = new TrainStatusDevice();
      
      // Set initial successful state
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.ON_TIME,
        selected: { trainId: '123' },
        raw: {}
      });
      await device.updateTrainStatus();
      expect(device.currentMode).toBe(0); // ON_TIME
      
      // Now trigger an error
      const error = new Error('Test error');
      getTrainStatus.mockRejectedValue(error);
      
      const statusChangeHandler = jest.fn();
      device.on('statusChange', statusChangeHandler);
      
      await expect(device.updateTrainStatus()).rejects.toThrow('Test error');
      
      // Should have emitted statusChange with mode change from ON_TIME to UNKNOWN
      expect(statusChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          previousMode: 0, // ON_TIME
          currentMode: 4, // UNKNOWN
          modeChanged: true,
          error: 'Test error'
        })
      );
    });

    test('does not emit statusChange if mode stays UNKNOWN on consecutive errors', async () => {
      const device = new TrainStatusDevice();
      
      // First error
      getTrainStatus.mockRejectedValue(new Error('First error'));
      await expect(device.updateTrainStatus()).rejects.toThrow('First error');
      expect(device.currentMode).toBe(4); // UNKNOWN
      
      // Second error
      const statusChangeHandler = jest.fn();
      device.on('statusChange', statusChangeHandler);
      
      getTrainStatus.mockRejectedValue(new Error('Second error'));
      await expect(device.updateTrainStatus()).rejects.toThrow('Second error');
      
      // Should not emit statusChange because mode didn't change (UNKNOWN -> UNKNOWN)
      expect(statusChangeHandler).not.toHaveBeenCalled();
    });
  });
});
