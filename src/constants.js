/**
 * Google Home Air Quality sensor states
 * These map to the action.devices.traits.SensorState values
 * for Air Quality sensors in Google Home smart home API
 */
export const AirQualityState = {
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
  VERY_POOR: 'very poor',
  UNKNOWN: 'unknown'
};

/**
 * Google Home Smart Home API constants
 * Reference: https://developers.google.com/assistant/smarthome/
 */
export const GoogleHomeApi = {
  // Intent types
  Intent: {
    SYNC: 'action.devices.SYNC',
    QUERY: 'action.devices.QUERY',
    EXECUTE: 'action.devices.EXECUTE',
    DISCONNECT: 'action.devices.DISCONNECT'
  },

  // Device types
  DeviceType: {
    SENSOR: 'action.devices.types.SENSOR',
    LIGHT: 'action.devices.types.LIGHT',
    SWITCH: 'action.devices.types.SWITCH',
    THERMOSTAT: 'action.devices.types.THERMOSTAT'
  },

  // Device traits
  Trait: {
    SENSOR_STATE: 'action.devices.traits.SensorState',
    ON_OFF: 'action.devices.traits.OnOff',
    BRIGHTNESS: 'action.devices.traits.Brightness'
  },

  // Sensor names
  SensorName: {
    AIR_QUALITY: 'AirQuality',
    CARBON_MONOXIDE_LEVEL: 'CarbonMonoxideLevel',
    SMOKE_LEVEL: 'SmokeLevel'
  },

  // Response status
  Status: {
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR',
    OFFLINE: 'OFFLINE',
    PENDING: 'PENDING'
  }
};

