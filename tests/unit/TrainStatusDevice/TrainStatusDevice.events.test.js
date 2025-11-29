import { TrainStatusDevice } from '../../../src/devices/TrainStatusDevice.js';
import { TrainStatus, MatterDevice } from '../../../src/constants.js';
import { getTrainStatus } from '../../../src/RTTBridge.js';

jest.mock('../../../src/RTTBridge.js');

describe('TrainStatusDevice events', () => {
  let device;

  beforeEach(() => {
    device = new TrainStatusDevice();
    jest.clearAllMocks();
  });

  afterEach(() => {
    device.stopPeriodicUpdates();
  });

  test('emits statusChange when mode changes', async () => {
    const events = [];
    device.on('statusChange', (payload) => events.push(payload));

    getTrainStatus.mockResolvedValueOnce({
      status: TrainStatus.ON_TIME,
      selected: { locationDetail: { gbttBookedDeparture: '0630' } },
      raw: {}
    });

    await device.updateTrainStatus();

    expect(device.getCurrentMode()).toBe(MatterDevice.Modes.ON_TIME.mode);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      previousMode: MatterDevice.Modes.UNKNOWN.mode,
      currentMode: MatterDevice.Modes.ON_TIME.mode,
      trainStatus: TrainStatus.ON_TIME,
      modeChanged: true,
    });
  });

  test('does not emit when mode stays the same', async () => {
    const handler = jest.fn();
    device.on('statusChange', handler);

    // First call sets ON_TIME
    getTrainStatus.mockResolvedValue({
      status: TrainStatus.ON_TIME,
      selected: { locationDetail: { gbttBookedDeparture: '0630' } },
      raw: {}
    });

    await device.updateTrainStatus();

    // Second call also ON_TIME
    getTrainStatus.mockResolvedValue({
      status: TrainStatus.ON_TIME,
      selected: { locationDetail: { gbttBookedDeparture: '0635' } },
      raw: {}
    });
    await device.updateTrainStatus();

    // Only one emission for the change from UNKNOWN -> ON_TIME
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('emits statusChange when error forces UNKNOWN from a known mode', async () => {
    const events = [];
    device.on('statusChange', (payload) => events.push(payload));

    // Set a known mode first
    getTrainStatus.mockResolvedValueOnce({
      status: TrainStatus.MINOR_DELAY,
      selected: { locationDetail: { gbttBookedDeparture: '0630' } },
      raw: {}
    });
    await device.updateTrainStatus();
    expect(device.getCurrentMode()).toBe(MatterDevice.Modes.MINOR_DELAY.mode);

    // Next call errors out
    getTrainStatus.mockRejectedValueOnce(new Error('API down'));
    await expect(device.updateTrainStatus()).rejects.toThrow('API down');

    // Should have emitted twice: first change to MINOR_DELAY, then to UNKNOWN
    expect(events.length).toBe(2);
    const last = events[1];
    expect(last.previousMode).toBe(MatterDevice.Modes.MINOR_DELAY.mode);
    expect(last.currentMode).toBe(MatterDevice.Modes.UNKNOWN.mode);
    expect(last.error).toBe('API down');
    expect(last.modeChanged).toBe(true);
  });
});
