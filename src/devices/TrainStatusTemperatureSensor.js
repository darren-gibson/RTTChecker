import { Device, DeviceTypes } from '@project-chip/matter.js/device';
import { ClusterServer } from '@project-chip/matter.js/cluster';
import { TemperatureMeasurementCluster, IdentifyCluster, BasicInformationCluster } from '@project-chip/matter.js/cluster';

import { MatterDevice as MatterConstants } from '../constants.js';
import { config } from '../config.js';

/**
 * Train Status Temperature Sensor Device
 * Exposes a Matter Temperature Sensor that maps train delay minutes to a temperature value.
 */
export class TrainStatusTemperatureSensor extends Device {
  constructor(name = 'Train Delay Sensor') {
    super(DeviceTypes.TEMPERATURE_SENSOR);
    this.name = name;

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

    this.addClusterServer(
      ClusterServer(
        TemperatureMeasurementCluster,
        {
          measuredValue: 0,
          minMeasuredValue: -1000,
          maxMeasuredValue: 5000,
        },
        {}
      )
    );

    this.addClusterServer(
      ClusterServer(
        IdentifyCluster,
        { identifyTime: 0 },
        {}
      )
    );
  }

  setDelayMinutes(delayMinutes) {
    const cluster = this.getClusterServer(TemperatureMeasurementCluster);
    if (!cluster) return;
    const tempCelsius = Math.min(Math.max(delayMinutes, -10), 50);
    const tempValue = Math.round(tempCelsius * 100);
    cluster.setMeasuredValueAttribute(tempValue);
  }

  setTemperature(tempCelsius) {
    const cluster = this.getClusterServer(TemperatureMeasurementCluster);
    if (cluster) {
      const tempValue = Math.round(tempCelsius * 100);
      cluster.setMeasuredValueAttribute(tempValue);
    }
  }
}
