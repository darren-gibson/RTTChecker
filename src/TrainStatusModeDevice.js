import { Device, DeviceTypes } from '@project-chip/matter.js/device';
import { ClusterServer } from '@project-chip/matter.js/cluster';
import { ModeSelectCluster } from '@project-chip/matter.js/cluster';
import { MatterDevice as MatterConstants } from './constants.js';

/**
 * Train Status Mode Device
 * A Matter Mode Select device that represents train punctuality status
 */
export class TrainStatusModeDevice extends Device {
  constructor(name = 'Train Status') {
    super(DeviceTypes.MODE_SELECT);
    
    // Set device name (must be done after super() call)
    this.name = name;
    
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
            console.log(`Mode change requested to: ${newMode} (read-only device)`);
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
      const modeLabel = this.getModeLabel(mode);
      console.log(`🚆 Train status: ${modeLabel} (mode ${mode})`);
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
