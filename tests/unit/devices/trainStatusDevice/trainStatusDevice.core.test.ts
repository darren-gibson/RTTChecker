// @ts-nocheck
import { TrainStatusDevice } from '../../../../src/devices/trainStatusDevice.js';
import { TrainStatus, MatterDevice } from '../../../../src/constants.js';
import { getTrainStatus } from '../../../../src/services/trainStatusService.js';
import { fixtures, clone } from '../../../fixtures/services.js';

jest.mock('../../../../src/services/trainStatusService.js');

describe('TrainStatusDevice - core', () => {
  let device: TrainStatusDevice;

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

  describe('updateTrainStatus', () => {
    test('updates mode to ON_TIME when train is on time', async () => {
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.ON_TIME,
        selected: clone(fixtures.onTime),
        raw: {},
      });

      await device.updateTrainStatus();
      expect(device.getCurrentMode()).toBe(MatterDevice.Modes.ON_TIME.mode);
    });

    test('emits statusChange event with normalized payload', async () => {
      getTrainStatus.mockResolvedValue({
        status: TrainStatus.MINOR_DELAY,
        selected: clone(fixtures.minorDelay),
        raw: { ok: true },
      });

      const events = [];
      device.on('statusChange', (e) => events.push(e));
      await device.updateTrainStatus();
      expect(events).toHaveLength(1);
      const e = events[0];
      expect(e.modeChanged).toBe(true);
      expect(e.trainStatus).toBe(TrainStatus.MINOR_DELAY);
      expect(e.selectedService).toBeTruthy();
      expect(e.error).toBe(null);
    });
  });
});
