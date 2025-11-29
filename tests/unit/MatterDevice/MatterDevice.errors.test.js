import { TrainStatusDevice } from '../../../src/MatterDevice.js';
import { TrainStatus } from '../../../src/constants.js';
import { getTrainStatus } from '../../../src/RTTBridge.js';
import { RTTApiError, NoTrainFoundError, RTTCheckerError } from '../../../src/errors.js';
import * as logger from '../../../src/logger.js';

jest.mock('../../../src/RTTBridge.js');

describe('TrainStatusDevice - errors', () => {
  // Silence logger for error-path tests
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
    expect(device.currentMode).toBe(4); // UNKNOWN
  });

  test('handles RTTApiError with isRetryable', async () => {
    const retryError = new RTTApiError('Service unavailable', { statusCode: 503 });
    retryError.isAuthError = () => false;
    retryError.isRetryable = () => true;
    getTrainStatus.mockRejectedValue(retryError);

    const device = new TrainStatusDevice();
    await expect(device.updateTrainStatus()).rejects.toThrow('Service unavailable');
    expect(device.currentMode).toBe(4); // UNKNOWN
  });

  test('handles NoTrainFoundError', async () => {
    const noTrainError = new NoTrainFoundError('No trains at this time');
    getTrainStatus.mockRejectedValue(noTrainError);

    const device = new TrainStatusDevice();
    await expect(device.updateTrainStatus()).rejects.toThrow('No trains at this time');
    expect(device.currentMode).toBe(4); // UNKNOWN
  });

  test('handles RTTCheckerError with context', async () => {
    const checkerError = new RTTCheckerError('Configuration error', { setting: 'ORIGIN_TIPLOC' });
    getTrainStatus.mockRejectedValue(checkerError);

    const device = new TrainStatusDevice();
    await expect(device.updateTrainStatus()).rejects.toThrow('Configuration error');
    expect(device.currentMode).toBe(4); // UNKNOWN
  });

  test('handles generic errors', async () => {
    const genericError = new Error('Something unexpected');
    getTrainStatus.mockRejectedValue(genericError);

    const device = new TrainStatusDevice();
    await expect(device.updateTrainStatus()).rejects.toThrow('Something unexpected');
    expect(device.currentMode).toBe(4); // UNKNOWN
  });
});
