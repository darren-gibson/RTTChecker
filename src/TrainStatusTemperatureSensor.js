import { Device, DeviceTypes } from '@project-chip/matter.js/device';
import { ClusterServer } from '@project-chip/matter.js/cluster';
import { TemperatureMeasurementCluster, IdentifyCluster, BasicInformationCluster } from '@project-chip/matter.js/cluster';

import { MatterDevice as MatterConstants } from './constants.js';
import { config } from './config.js';

/**
 * Train Status Temperature Sensor Device
 * Exposes a Matter Temperature Sensor that maps train delay minutes to a temperature value.
 * This provides excellent Google Home voice/app support with simple queries like "What's the temperature?"
 * 
 * Mapping strategy:
 * - Direct 1:1 mapping: delay minutes = temperature in Celsius
 * - 0 minutes delay = 0°C (on time)
 * - Positive values = minutes late (e.g., 5 min late = 5°C, 15 min late = 15°C)
 * - Negative values = minutes early (e.g., 2 min early = -2°C)
 * - Capped at 50°C maximum for extreme delays
 */
export class TrainStatusTemperatureSensor extends Device {
  constructor(name = 'Train Delay Sensor') {
    super(DeviceTypes.TEMPERATURE_SENSOR);
    
    // Set device name (must be done after super() call)
    this.name = name;

    // Add BasicInformation cluster when NOT using bridge so controllers use these name attributes directly
    if (!config.matter.useBridge) {
      this.addClusterServer(
        ClusterServer(
          BasicInformationCluster,
          {
            vendorName: config.matter.vendorName,
            vendorId: MatterConstants.VendorId,
            productName: name,
            productLabel: name,
            nodeLabel: name,
            hardwareVersion: 1,
            hardwareVersionString: '1.0',
            softwareVersion: 1,
            softwareVersionString: '1.0',
            serialNumber: `${config.matter.serialNumber}-TEMP`,
            reachable: true,
          },
          {},
          { startUp: true, shutDown: true, leave: true, reachableChanged: true }
        )
      );
    }

    // Add TemperatureMeasurement cluster (primary sensor for Google Home)
    // Temperature is in 0.01°C units (hundredths of a degree)
    this.addClusterServer(
      ClusterServer(
        TemperatureMeasurementCluster,
        {
          measuredValue: 0, // 0°C default (on time)
          minMeasuredValue: -1000,   // -10°C (up to 10 min early)
          maxMeasuredValue: 5000, // 50°C (capped at 50 min delay)
        },
        {}
      )
    );

    // Add Identify cluster as required by TEMPERATURE_SENSOR device type
    this.addClusterServer(
      ClusterServer(
        IdentifyCluster,
        {
          identifyTime: 0,
        },
        {}
      )
    );
  }

  /**
   * Update temperature based on train delay in minutes.
   * Direct 1:1 mapping: delay minutes = temperature in Celsius.
   * 
   * @param {number} delayMinutes - Delay in minutes (negative for early, positive for late)
   */
  setDelayMinutes(delayMinutes) {
    const cluster = this.getClusterServer(TemperatureMeasurementCluster);
    if (!cluster) return;

    // Direct mapping: delay minutes = temperature in Celsius
    // Cap at 50°C maximum for extreme delays
    const tempCelsius = Math.min(Math.max(delayMinutes, -10), 50);
    const tempValue = Math.round(tempCelsius * 100); // Convert to 0.01°C units

    cluster.setMeasuredValueAttribute(tempValue);
    // Temperature update logged by calling code via facility logger
  }

  /**
   * Set temperature directly (for testing or custom mappings)
   * @param {number} tempCelsius - Temperature in degrees Celsius
   */
  setTemperature(tempCelsius) {
    const cluster = this.getClusterServer(TemperatureMeasurementCluster);
    if (cluster) {
      const tempValue = Math.round(tempCelsius * 100);
      cluster.setMeasuredValueAttribute(tempValue);
      // Temperature update logged by calling code via facility logger
    }
  }
}
