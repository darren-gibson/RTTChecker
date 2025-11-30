import { TrainStatus, MatterDevice } from '../src/constants.js';

describe('TrainStatus constants', () => {
  test('all expected states are defined', () => {
    expect(TrainStatus.ON_TIME).toBe('on_time');
    expect(TrainStatus.MINOR_DELAY).toBe('minor_delay');
    expect(TrainStatus.DELAYED).toBe('delayed');
    expect(TrainStatus.MAJOR_DELAY).toBe('major_delay');
    expect(TrainStatus.UNKNOWN).toBe('unknown');
  });

  test('Object.values returns all state values', () => {
    const values = Object.values(TrainStatus);
    expect(values).toHaveLength(5);
    expect(values).toContain('on_time');
    expect(values).toContain('minor_delay');
    expect(values).toContain('delayed');
    expect(values).toContain('major_delay');
    expect(values).toContain('unknown');
  });

  test('constants are valid strings', () => {
    const values = Object.values(TrainStatus);
    values.forEach((value) => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });
});

describe('MatterDevice constants', () => {
  test('Modes are defined with mode number and label', () => {
    expect(MatterDevice.Modes.ON_TIME).toEqual({ mode: 0, label: 'On Time' });
    expect(MatterDevice.Modes.MINOR_DELAY).toEqual({ mode: 1, label: 'Minor Delay' });
    expect(MatterDevice.Modes.DELAYED).toEqual({ mode: 2, label: 'Delayed' });
    expect(MatterDevice.Modes.MAJOR_DELAY).toEqual({ mode: 3, label: 'Major Delay' });
    expect(MatterDevice.Modes.UNKNOWN).toEqual({ mode: 4, label: 'Unknown' });
  });

  test('Mode numbers are sequential', () => {
    expect(MatterDevice.Modes.ON_TIME.mode).toBe(0);
    expect(MatterDevice.Modes.MINOR_DELAY.mode).toBe(1);
    expect(MatterDevice.Modes.DELAYED.mode).toBe(2);
    expect(MatterDevice.Modes.MAJOR_DELAY.mode).toBe(3);
    expect(MatterDevice.Modes.UNKNOWN.mode).toBe(4);
  });

  test('Device identification constants are defined', () => {
    expect(MatterDevice.VendorId).toBe(0xfff1);
    expect(MatterDevice.ProductId).toBe(0x8001);
    expect(MatterDevice.DeviceType).toBe(0x000f);
  });

  test('all mode labels are user-friendly strings', () => {
    const modes = Object.values(MatterDevice.Modes);
    modes.forEach((mode) => {
      expect(typeof mode.label).toBe('string');
      expect(mode.label.length).toBeGreaterThan(0);
      expect(mode.label).toMatch(/^[A-Z]/); // Starts with capital letter
    });
  });
});
