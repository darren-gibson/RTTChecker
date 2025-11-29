import { TrainStatusDevice } from '../../../../src/devices/TrainStatusDevice.js';
import { TrainStatus } from '../../../../src/constants.js';
import { getTrainStatus } from '../../../../src/services/trainStatusService.js';
import { RTTApiError, NoTrainFoundError, RTTCheckerError } from '../../../../src/errors.js';
import * as logger from '../../../../src/utils/logger.js';

jest.mock('../../../../src/services/trainStatusService.js');

describe('TrainStatusDevice - errors', () => {
  beforeAll(() => {
    try {
      jest.spyOn(logger, 'log').mockReturnValue({
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
      });
      if (logger.setLogLevel) logger.setLogLevel('error');
    } catch (_) {}
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('handles RTTApiError with isAuthError', async () => {
    const authError = new RTTApiError('Unauthorized', { statusCode: 401 });
    authError.isAuthError = () => true;
    authError.isRetryable = () => false;
    getTrainStatus.mockRejectedValue(authError);

    const device = new TrainStatusDevice();
    await expect(device.updateTrainStatus()).rejects.toThrow('Unauthorized');
    expect(device.currentMode).toBe(4);
  });

  test('handles RTTApiError with isRetryable', async () => {
    const retryError = new RTTApiError('Service Unavailable', { statusCode: 503 });
    retryError.isAuthError = () => false;
    retryError.isRetryable = () => true;
    getTrainStatus.mockRejectedValue(retryError);

    const device = new TrainStatusDevice();
    await expect(device.updateTrainStatus()).rejects.toThrow('Service Unavailable');
    expect(device.currentMode).toBe(4);
  });

  test('handles NoTrainFoundError', async () => {
    const ntfError = new NoTrainFoundError('No trains at this time');
    getTrainStatus.mockRejectedValue(ntfError);
    const device = new TrainStatusDevice();
    await expect(device.updateTrainStatus()).rejects.toThrow('No trains at this time');
    expect(device.currentMode).toBe(4);
  });

  test('handles generic Error', async () => {
    getTrainStatus.mockRejectedValue(new Error('Boom'));
    const device = new TrainStatusDevice();
    await expect(device.updateTrainStatus()).rejects.toThrow('Boom');
    expect(device.currentMode).toBe(4);
  });
});
