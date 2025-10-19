import { AirQualityState, GoogleHomeApi } from '../src/constants.js';

describe('AirQualityState constants', () => {
  test('all expected states are defined', () => {
    expect(AirQualityState.GOOD).toBe('good');
    expect(AirQualityState.FAIR).toBe('fair');
    expect(AirQualityState.POOR).toBe('poor');
    expect(AirQualityState.VERY_POOR).toBe('very poor');
    expect(AirQualityState.UNKNOWN).toBe('unknown');
  });

  test('Object.values returns all state values', () => {
    const values = Object.values(AirQualityState);
    expect(values).toHaveLength(5);
    expect(values).toContain('good');
    expect(values).toContain('fair');
    expect(values).toContain('poor');
    expect(values).toContain('very poor');
    expect(values).toContain('unknown');
  });

  test('constants match Google Home Air Quality sensor requirements', () => {
    // Verify the values are Google Home compatible strings
    const values = Object.values(AirQualityState);
    values.forEach(value => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });
});

describe('GoogleHomeApi constants', () => {
  test('Intent constants are defined', () => {
    expect(GoogleHomeApi.Intent.SYNC).toBe('action.devices.SYNC');
    expect(GoogleHomeApi.Intent.QUERY).toBe('action.devices.QUERY');
    expect(GoogleHomeApi.Intent.EXECUTE).toBe('action.devices.EXECUTE');
    expect(GoogleHomeApi.Intent.DISCONNECT).toBe('action.devices.DISCONNECT');
  });

  test('DeviceType constants are defined', () => {
    expect(GoogleHomeApi.DeviceType.SENSOR).toBe('action.devices.types.SENSOR');
    expect(GoogleHomeApi.DeviceType.LIGHT).toBe('action.devices.types.LIGHT');
    expect(GoogleHomeApi.DeviceType.SWITCH).toBe('action.devices.types.SWITCH');
    expect(GoogleHomeApi.DeviceType.THERMOSTAT).toBe('action.devices.types.THERMOSTAT');
  });

  test('Trait constants are defined', () => {
    expect(GoogleHomeApi.Trait.SENSOR_STATE).toBe('action.devices.traits.SensorState');
    expect(GoogleHomeApi.Trait.ON_OFF).toBe('action.devices.traits.OnOff');
    expect(GoogleHomeApi.Trait.BRIGHTNESS).toBe('action.devices.traits.Brightness');
  });

  test('SensorName constants are defined', () => {
    expect(GoogleHomeApi.SensorName.AIR_QUALITY).toBe('AirQuality');
    expect(GoogleHomeApi.SensorName.CARBON_MONOXIDE_LEVEL).toBe('CarbonMonoxideLevel');
    expect(GoogleHomeApi.SensorName.SMOKE_LEVEL).toBe('SmokeLevel');
  });

  test('Status constants are defined', () => {
    expect(GoogleHomeApi.Status.SUCCESS).toBe('SUCCESS');
    expect(GoogleHomeApi.Status.ERROR).toBe('ERROR');
    expect(GoogleHomeApi.Status.OFFLINE).toBe('OFFLINE');
    expect(GoogleHomeApi.Status.PENDING).toBe('PENDING');
  });

  test('all constants follow Google Home API naming conventions', () => {
    // Intent strings should start with 'action.devices.'
    expect(GoogleHomeApi.Intent.SYNC).toMatch(/^action\.devices\./);
    expect(GoogleHomeApi.Intent.QUERY).toMatch(/^action\.devices\./);
    
    // DeviceType strings should start with 'action.devices.types.'
    expect(GoogleHomeApi.DeviceType.SENSOR).toMatch(/^action\.devices\.types\./);
    
    // Trait strings should start with 'action.devices.traits.'
    expect(GoogleHomeApi.Trait.SENSOR_STATE).toMatch(/^action\.devices\.traits\./);
  });
});
