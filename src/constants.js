/**
 * Train status states for Matter Mode Select cluster
 * These map to discrete modes that represent train punctuality
 */
export const TrainStatus = {
  ON_TIME: 'on_time',
  MINOR_DELAY: 'minor_delay',
  DELAYED: 'delayed',
  MAJOR_DELAY: 'major_delay',
  UNKNOWN: 'unknown'
};

/**
 * Matter device constants for Mode Select cluster
 * Reference: https://github.com/project-chip/connectedhomeip
 */
export const MatterDevice = {
  // Mode Select cluster modes for train status
  Modes: {
    ON_TIME: { mode: 0, label: 'On Time' },
    MINOR_DELAY: { mode: 1, label: 'Minor Delay' },
    DELAYED: { mode: 2, label: 'Delayed' },
    MAJOR_DELAY: { mode: 3, label: 'Major Delay' },
    UNKNOWN: { mode: 4, label: 'Unknown' }
  },

  // Device identification
  VendorId: 0xFFF1,  // Test vendor ID
  ProductId: 0x8001, // Train status device

  // Device type (using Generic Switch as base for Mode Select)
  DeviceType: 0x000F // Generic Switch with Mode Select
};

