import { ModeSelectServer } from '@matter/main/behaviors/mode-select';
import type { TrainStatusType } from '../../constants.js';

import { STATUS_TO_MODE } from '../../domain/modeMapping.js';
import { loggers } from '../../utils/logger.js';

const log = loggers.matter;

/**
 * Custom Mode Select Behavior
 * Represents train status as mode selection
 *
 * Provides 5 modes representing different train punctuality states:
 * - Mode 0: On Time (0-2 min delay)
 * - Mode 1: Minor Delay (3-5 min)
 * - Mode 2: Delayed (6-10 min)
 * - Mode 3: Major Delay (11+ min)
 * - Mode 4: Unknown
 */
export class TrainStatusModeServer extends ModeSelectServer {
  /**
   * Update the mode based on train status code
   */
  async setTrainStatus(statusCode: TrainStatusType): Promise<void> {
    const modeValue = STATUS_TO_MODE[statusCode] ?? STATUS_TO_MODE.unknown;
    await this.changeToMode({ newMode: modeValue });
  }

  override async initialize() {
    // Define available modes and required attributes BEFORE calling super.initialize()
    // This ensures supportedModes is set when currentMode is validated
    this.state.description = 'Train punctuality status';
    this.state.standardNamespace = null; // No standard namespace for custom modes
    this.state.supportedModes = [
      { label: 'On Time', mode: 0, semanticTags: [] },
      { label: 'Minor Delay', mode: 1, semanticTags: [] },
      { label: 'Delayed', mode: 2, semanticTags: [] },
      { label: 'Major Delay', mode: 3, semanticTags: [] },
      { label: 'Unknown', mode: 4, semanticTags: [] },
    ];
    this.state.currentMode = 4; // Start as unknown

    try {
      await super.initialize?.();
    } catch (err) {
      const error = err as Error;
      log.error(`BridgedInfoMode super.initialize failed: ${error?.stack || error}`);
      throw error;
    }
  }
}
