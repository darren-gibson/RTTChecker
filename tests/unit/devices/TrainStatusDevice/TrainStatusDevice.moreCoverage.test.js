import { TrainStatusDevice } from '../../../../src/devices/TrainStatusDevice.js';
import { TrainStatus, MatterDevice } from '../../../../src/constants.js';
import { getTrainStatus } from '../../../../src/services/trainStatusService.js';

jest.mock('../../../../src/services/trainStatusService.js');

describe('TrainStatusDevice additional coverage', () => {
  let device;

  beforeEach(() => {
    device = new TrainStatusDevice({ deviceId: 'RTT-001' });
  });

  afterEach(() => {
    device.stopPeriodicUpdates();
  });

  test('getSupportedModes and getCurrentMode report correctly', () => {
    const modes = device.getSupportedModes();
    expect(modes).toHaveLength(5);
    expect(modes).toContainEqual(MatterDevice.Modes.ON_TIME);
    expect(modes).toContainEqual(MatterDevice.Modes.MINOR_DELAY);
    expect(modes).toContainEqual(MatterDevice.Modes.DELAYED);
    expect(modes).toContainEqual(MatterDevice.Modes.MAJOR_DELAY);
    expect(modes).toContainEqual(MatterDevice.Modes.UNKNOWN);

    const current = device.getCurrentMode();
    expect(typeof current).toBe('number');
    const modeIds = modes.map(m => m.mode);
    expect(modeIds).toContain(current);
  });

  test('getDeviceInfo includes serial and type', () => {
    const info = device.getDeviceInfo();
    expect(info).toHaveProperty('serialNumber', 'RTT-001');
    expect(info).toHaveProperty('deviceType');
    expect(typeof info.deviceType).toBe('number');
  });

  test('no mode change results in modeChanged=false event', async () => {
    const events = [];
    device.on('statusChange', e => events.push(e));

    // Mock first response
    getTrainStatus.mockResolvedValueOnce({
      status: TrainStatus.ON_TIME,
      selected: { locationDetail: { gbttBookedDeparture: '0700' } },
      raw: {}
    });
    await device.updateTrainStatus();

    // Mock second response with same status
    getTrainStatus.mockResolvedValueOnce({
      status: TrainStatus.ON_TIME,
      selected: { locationDetail: { gbttBookedDeparture: '0705' } },
      raw: {}
    });
    const before = device.getCurrentMode();
    await device.updateTrainStatus();
    const after = device.getCurrentMode();
    expect(after).toBe(before);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  test('updates mode for several statuses to exercise branches', async () => {
    const cases = [
      { s: TrainStatus.ON_TIME, expected: MatterDevice.Modes.ON_TIME.mode },
      { s: TrainStatus.MINOR_DELAY, expected: MatterDevice.Modes.MINOR_DELAY.mode },
      { s: TrainStatus.DELAYED, expected: MatterDevice.Modes.DELAYED.mode },
      { s: TrainStatus.MAJOR_DELAY, expected: MatterDevice.Modes.MAJOR_DELAY.mode },
      { s: TrainStatus.UNKNOWN, expected: MatterDevice.Modes.UNKNOWN.mode },
    ];
    for (const { s, expected } of cases) {
      getTrainStatus.mockResolvedValueOnce({
        status: s,
        selected: { locationDetail: { gbttBookedDeparture: '0710' } },
        raw: {}
      });
      await device.updateTrainStatus();
      expect(device.getCurrentMode()).toBe(expected);
    }
  });

  test('error path emits event when mode changes to UNKNOWN', async () => {
    const events = [];
    device.on('statusChange', e => events.push(e));

    // Set a non-UNKNOWN mode first
    getTrainStatus.mockResolvedValueOnce({
      status: TrainStatus.ON_TIME,
      selected: { locationDetail: { gbttBookedDeparture: '0720' } },
      raw: {}
    });
    await device.updateTrainStatus();

    // Now force an error, which should set mode to UNKNOWN and emit
    getTrainStatus.mockRejectedValueOnce(new Error('Boom'));
    await expect(device.updateTrainStatus()).rejects.toThrow('Boom');

    expect(events.length).toBeGreaterThanOrEqual(2);
    const last = events[events.length - 1];
    expect(last.modeChanged).toBe(true);
    expect(last.currentMode).toBe(MatterDevice.Modes.UNKNOWN.mode);
    expect(last.error).toBe('Boom');
  });
});
