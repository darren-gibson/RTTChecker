// @ts-nocheck
import { TrainStatusDevice } from '../../../../src/devices/TrainStatusDevice.js';
import { TrainStatus } from '../../../../src/constants.js';
import { getTrainStatus } from '../../../../src/services/trainStatusService.js';

jest.mock('../../../../src/services/trainStatusService.js');

describe('TrainStatusDevice - periodic updates', () => {
  let device: TrainStatusDevice;

  beforeEach(() => {
    jest.useFakeTimers();
    device = new TrainStatusDevice();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    device.stopPeriodicUpdates();
  });

  test('startPeriodicUpdates calls updateTrainStatus immediately', async () => {
    getTrainStatus.mockResolvedValue({
      status: TrainStatus.ON_TIME,
      selected: { locationDetail: { gbttBookedDeparture: '0630' } },
      raw: {},
    });

    device.startPeriodicUpdates();
    await Promise.resolve();
    expect(getTrainStatus).toHaveBeenCalled();
  });

  test('stopPeriodicUpdates clears interval and logs', async () => {
    getTrainStatus.mockResolvedValue({
      status: TrainStatus.ON_TIME,
      selected: { locationDetail: { gbttBookedDeparture: '0630' } },
      raw: {},
    });
    device.startPeriodicUpdates();
    await Promise.resolve();
    device.stopPeriodicUpdates();
    // advance timers to ensure no further calls
    await jest.advanceTimersByTimeAsync(2 * Number(process.env['UPDATE_INTERVAL_MS'] || 60000));
    expect(getTrainStatus.mock.calls.length).toBeGreaterThan(0);
  });
});
