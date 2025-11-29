import { TrainStatusDevice } from '../../../src/MatterDevice.js';
import { TrainStatus } from '../../../src/constants.js';
import { getTrainStatus } from '../../../src/RTTBridge.js';

jest.mock('../../../src/RTTBridge.js');

describe('TrainStatusDevice - periodic updates', () => {
  let device;

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
      raw: {}
    });

    device.startPeriodicUpdates();
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
    await Promise.resolve();

    jest.advanceTimersByTime(60000);
    await Promise.resolve();
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
    expect(getTrainStatus.mock.calls.length).toBe(callCountAfterStart);
  });
});
