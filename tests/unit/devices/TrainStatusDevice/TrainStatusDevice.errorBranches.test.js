import { TrainStatusDevice } from '../../../../src/devices/TrainStatusDevice.js';
import { TrainStatus, MatterDevice } from '../../../../src/constants.js';
import { getTrainStatus } from '../../../../src/services/trainStatusService.js';
import { RTTApiError } from '../../../../src/api/errors.js';

jest.mock('../../../../src/services/trainStatusService.js');

describe('TrainStatusDevice - RTTApiError branches', () => {
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
  });

  afterEach(() => {
    device.stopPeriodicUpdates();
    jest.clearAllMocks();
  });

  test('handles RTTApiError isAuthError', async () => {
    const authErr = new RTTApiError('Unauthorized', { statusCode: 401 });
    authErr.isAuthError = () => true;
    authErr.isRetryable = () => false;
    getTrainStatus.mockRejectedValueOnce(authErr);

    const before = device.getCurrentMode();
    await expect(device.updateTrainStatus()).rejects.toThrow('Unauthorized');
    const after = device.getCurrentMode();
    expect(before).toBe(MatterDevice.Modes.ON_TIME.mode);
    expect(after).toBe(MatterDevice.Modes.UNKNOWN.mode);
  });

  test('handles RTTApiError isRetryable', async () => {
    const retryErr = new RTTApiError('Service Unavailable', { statusCode: 503 });
    retryErr.isAuthError = () => false;
    retryErr.isRetryable = () => true;
    getTrainStatus.mockRejectedValueOnce(retryErr);

    const before = device.getCurrentMode();
    await expect(device.updateTrainStatus()).rejects.toThrow('Service Unavailable');
    const after = device.getCurrentMode();
    expect(before).toBe(MatterDevice.Modes.ON_TIME.mode);
    expect(after).toBe(MatterDevice.Modes.UNKNOWN.mode);
  });
});
