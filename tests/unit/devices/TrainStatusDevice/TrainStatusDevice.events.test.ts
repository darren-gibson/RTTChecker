// @ts-nocheck
import { TrainStatusDevice } from '../../../../src/devices/TrainStatusDevice.js';
import { TrainStatus, MatterDevice } from '../../../../src/constants.js';
import { getTrainStatus } from '../../../../src/services/trainStatusService.js';

jest.mock('../../../../src/services/trainStatusService.js');

describe('TrainStatusDevice events', () => {
  let device: TrainStatusDevice;

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
      selected: {
        locationDetail: { gbttBookedDeparture: '0630', realtimeGbttDepartureLateness: 0 },
      },
      raw: {},
    });

    await device.updateTrainStatus();

    expect(device.getCurrentMode()).toBe(MatterDevice.Modes.ON_TIME.mode);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      previousMode: MatterDevice.Modes.UNKNOWN.mode,
      currentMode: MatterDevice.Modes.ON_TIME.mode,
      trainStatus: TrainStatus.ON_TIME,
      modeChanged: true,
      delayMinutes: 0,
    });
  });

  test('emits on first update even if mode does not change', async () => {
    const handler = jest.fn();
    device.on('statusChange', handler);

    // First update with UNKNOWN status (mode stays UNKNOWN)
    getTrainStatus.mockResolvedValueOnce({
      status: TrainStatus.UNKNOWN,
      selected: null,
      raw: {},
    });

    await device.updateTrainStatus();

    // Should emit on first update even though mode didn't change
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      previousMode: MatterDevice.Modes.UNKNOWN.mode,
      currentMode: MatterDevice.Modes.UNKNOWN.mode,
      trainStatus: TrainStatus.UNKNOWN,
      modeChanged: false,
      selectedService: null,
      delayMinutes: null,
    });
  });

  test('emits when delayMinutes changes even if mode stays the same', async () => {
    const handler = jest.fn();
    device.on('statusChange', handler);

    // First call sets ON_TIME with 0 minutes delay
    getTrainStatus.mockResolvedValueOnce({
      status: TrainStatus.ON_TIME,
      selected: {
        locationDetail: { gbttBookedDeparture: '0630', realtimeGbttDepartureLateness: 0 },
      },
      raw: {},
    });

    await device.updateTrainStatus();

    // Second call also ON_TIME but now with 2 minutes delay
    getTrainStatus.mockResolvedValueOnce({
      status: TrainStatus.ON_TIME,
      selected: {
        locationDetail: { gbttBookedDeparture: '0635', realtimeGbttDepartureLateness: 2 },
      },
      raw: {},
    });
    await device.updateTrainStatus();

    // Should emit twice: once for UNKNOWN->ON_TIME, once for delay change 0->2
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[0][0].delayMinutes).toBe(0);
    expect(handler.mock.calls[1][0].delayMinutes).toBe(2);
  });

  test('does not emit when mode and delay stay the same', async () => {
    const handler = jest.fn();
    device.on('statusChange', handler);

    // First call sets ON_TIME with 0 minutes delay
    getTrainStatus.mockResolvedValue({
      status: TrainStatus.ON_TIME,
      selected: {
        locationDetail: { gbttBookedDeparture: '0630', realtimeGbttDepartureLateness: 0 },
      },
      raw: {},
    });

    await device.updateTrainStatus();

    // Second call also ON_TIME with same 0 minutes delay
    getTrainStatus.mockResolvedValue({
      status: TrainStatus.ON_TIME,
      selected: {
        locationDetail: { gbttBookedDeparture: '0635', realtimeGbttDepartureLateness: 0 },
      },
      raw: {},
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
      raw: {},
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
