/**
 * Train status states for Matter Mode Select cluster
 * These map to discrete modes that represent train punctuality
 */
export const TrainStatus = {
  ON_TIME: 'on_time',
  MINOR_DELAY: 'minor_delay',
  DELAYED: 'delayed',
  MAJOR_DELAY: 'major_delay',
  UNKNOWN: 'unknown',
} as const;

export type TrainStatusType = (typeof TrainStatus)[keyof typeof TrainStatus];

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
    UNKNOWN: { mode: 4, label: 'Unknown' },
  },

  // Device identification
  VendorId: 0xfff1 as const, // Test vendor ID
  ProductId: 0x8001 as const, // Train status device

  // Device type (using Generic Switch as base for Mode Select)
  DeviceType: 0x000f as const, // Generic Switch with Mode Select
} as const;

export type MatterMode = {
  mode: number;
  label: string;
};

/**
 * Timing and status calculation constants
 */
export const Timing = {
  // Default search offsets
  DEFAULT_MIN_AFTER_MINUTES: 20 as const,
  DEFAULT_WINDOW_MINUTES: 60 as const,
  // Sentinel temperature/delay value for unknown state
  UNKNOWN_DELAY_SENTINEL: 99 as const,
  // Lateness thresholds (absolute minutes late)
  LATE_THRESHOLDS: {
    ON_TIME: 2,
    MINOR: 5,
    DELAYED: 10,
  } as const,
} as const;
