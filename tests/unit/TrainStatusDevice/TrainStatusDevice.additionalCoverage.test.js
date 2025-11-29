import { TrainStatusDevice } from '../../../src/devices/TrainStatusDevice.js';
import { TrainStatus, MatterDevice } from '../../../src/constants.js';
import { getTrainStatus } from '../../../src/RTTBridge.js';
import { RTTApiError, NoTrainFoundError, RTTCheckerError } from '../../../src/errors.js';

jest.mock('../../../src/RTTBridge.js');

describe('TrainStatusDevice - additional coverage', () => {
  let device;

  beforeEach(async () => {
    device = new TrainStatusDevice();
    // Set a known non-UNKNOWN mode first
    getTrainStatus.mockResolvedValueOnce({
      status: TrainStatus.ON_TIME,
      selected: { locationDetail: { gbttBookedDeparture: '0700' } },
      raw: {}
    });
    await device.updateTrainStatus();
    jest.clearAllMocks();
  });

  afterEach(() => {
    device.stopPeriodicUpdates();
  });

  test('handles generic RTTApiError (not auth, not retryable) from non-UNKNOWN mode', async () => {
    const genericErr = new RTTApiError('Bad Gateway', { statusCode: 502 });
    genericErr.isAuthError = () => false;
    genericErr.isRetryable = () => false;
    getTrainStatus.mockRejectedValueOnce(genericErr);

    const before = device.getCurrentMode();
    await expect(device.updateTrainStatus()).rejects.toThrow('Bad Gateway');
    const after = device.getCurrentMode();
    expect(before).toBe(MatterDevice.Modes.ON_TIME.mode);
    expect(after).toBe(MatterDevice.Modes.UNKNOWN.mode);
  });

  test('handles NoTrainFoundError from non-UNKNOWN mode', async () => {
    const ntfErr = new NoTrainFoundError('No trains at this time');
    getTrainStatus.mockRejectedValueOnce(ntfErr);

    const before = device.getCurrentMode();
    await expect(device.updateTrainStatus()).rejects.toThrow('No trains at this time');
    const after = device.getCurrentMode();
    expect(before).toBe(MatterDevice.Modes.ON_TIME.mode);
    expect(after).toBe(MatterDevice.Modes.UNKNOWN.mode);
  });

  test('handles RTTCheckerError from non-UNKNOWN mode', async () => {
    const rttErr = new RTTCheckerError('Internal error', { detail: 'test' });
    getTrainStatus.mockRejectedValueOnce(rttErr);

    const before = device.getCurrentMode();
    await expect(device.updateTrainStatus()).rejects.toThrow('Internal error');
    const after = device.getCurrentMode();
    expect(before).toBe(MatterDevice.Modes.ON_TIME.mode);
    expect(after).toBe(MatterDevice.Modes.UNKNOWN.mode);
  });

  test('startPeriodicUpdates initiates immediate fetch', async () => {
    const freshDevice = new TrainStatusDevice();
    getTrainStatus.mockResolvedValueOnce({
      status: TrainStatus.MINOR_DELAY,
      selected: { locationDetail: { gbttBookedDeparture: '0710' } },
      raw: {}
    });

    freshDevice.startPeriodicUpdates();
    await new Promise(resolve => setImmediate(resolve));
    
    expect(getTrainStatus).toHaveBeenCalled();
    freshDevice.stopPeriodicUpdates();
  });

  test('stopPeriodicUpdates clears interval when interval exists', () => {
    device.startPeriodicUpdates();
    expect(device.updateInterval).not.toBeNull();
    
    device.stopPeriodicUpdates();
    expect(device.updateInterval).toBeNull();
  });

  test('stopPeriodicUpdates does nothing when no interval exists', () => {
    expect(device.updateInterval).toBeNull();
    device.stopPeriodicUpdates();
    expect(device.updateInterval).toBeNull();
  });
});
