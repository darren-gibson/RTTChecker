import { Device, DeviceTypes } from '@project-chip/matter.js/device';
import { ClusterServer } from '@project-chip/matter.js/cluster';
import { ModeSelectCluster, BasicInformationCluster } from '@project-chip/matter.js/cluster';

import { MatterDevice as MatterConstants } from './constants.js';
import { config } from './config.js';

/**
 * Train Status Mode Device
 * A Matter Mode Select device that represents train punctuality status
 */
export class TrainStatusModeDevice extends Device {
  constructor(name = 'Train Status') {
    super(DeviceTypes.MODE_SELECT);
    
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
            serialNumber: `${config.matter.serialNumber}-MODE`,
            reachable: true,
          },
          {},
          { startUp: true, shutDown: true, leave: true, reachableChanged: true }
        )
      );
    }
    
    // Map our train status modes to Matter Mode Select format
    const supportedModes = [
      {
        label: MatterConstants.Modes.ON_TIME.label,
        mode: MatterConstants.Modes.ON_TIME.mode,
        semanticTags: []
      },
      {
        label: MatterConstants.Modes.MINOR_DELAY.label,
        mode: MatterConstants.Modes.MINOR_DELAY.mode,
        semanticTags: []
      },
      {
        label: MatterConstants.Modes.DELAYED.label,
        mode: MatterConstants.Modes.DELAYED.mode,
        semanticTags: []
      },
      {
        label: MatterConstants.Modes.MAJOR_DELAY.label,
        mode: MatterConstants.Modes.MAJOR_DELAY.mode,
        semanticTags: []
      },
      {
        label: MatterConstants.Modes.UNKNOWN.label,
        mode: MatterConstants.Modes.UNKNOWN.mode,
        semanticTags: []
      }
    ];

    // Create Mode Select cluster server
    this.addClusterServer(
      ClusterServer(
        ModeSelectCluster,
        {
          description: 'Train punctuality status',
          standardNamespace: null,
          supportedModes,
          currentMode: MatterConstants.Modes.UNKNOWN.mode,
          startUpMode: null
        },
        {
          // Handle mode change requests (optional - we're read-only)
          changeToMode: async ({ request: { newMode } }) => {
            // For a read-only device, we ignore manual changes
          }
        }
      )
    );
  }

  /**
   * Update the current mode to reflect train status
   * @param {number} mode - Mode number from MatterConstants.Modes
   */
  setCurrentMode(mode) {
  const cluster = this.getClusterServer(ModeSelectCluster);
    if (cluster) {
      cluster.setCurrentModeAttribute(mode);
      // Mode update logged by calling code via facility logger
    }
  }

  /**
   * Get the current mode
   * @returns {number}
   */
  getCurrentMode() {
  const cluster = this.getClusterServer(ModeSelectCluster);
    return cluster?.getCurrentModeAttribute() ?? MatterConstants.Modes.UNKNOWN.mode;
  }

  /**
   * Get human-readable label for a mode
   * @param {number} mode
   * @returns {string}
   */
  getModeLabel(mode) {
    const modeEntry = Object.values(MatterConstants.Modes).find(m => m.mode === mode);
    return modeEntry?.label ?? 'Unknown';
  }
}
