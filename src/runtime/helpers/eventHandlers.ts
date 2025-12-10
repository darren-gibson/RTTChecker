import type { Endpoint } from '@matter/main';

import { loggers } from '../../utils/logger.js';
import type { StatusChangeEvent } from '../../devices/trainStatusDevice.js';
import { deriveModeFromDelay, MODE_TO_STATUS } from '../../domain/modeMapping.js';

const log = loggers.matter;

/**
 * Handles train status change events and updates Matter endpoints accordingly.
 *
 * Updates mode device, temperature sensor, and air quality sensor based on train status.
 */
export async function handleStatusChange(
  status: StatusChangeEvent,
  endpoints: {
    tempSensor?: Endpoint;
    modeDevice?: Endpoint;
    airQualityDevice?: Endpoint;
  }
): Promise<void> {
  log.debug(
    {
      mode: status?.currentMode,
      previousMode: status?.previousMode,
      delay: status?.delayMinutes,
      status: status?.trainStatus,
    },
    'Train status changed'
  );

  try {
    // Derive mode from delay when available; otherwise use currentMode or unknown
    let computedMode = deriveModeFromDelay(status?.delayMinutes);
    // Fallback to provided currentMode if derivation failed (e.g., non-numeric)
    if (Number.isNaN(Number(status?.delayMinutes)) && typeof status?.currentMode === 'number') {
      computedMode = status.currentMode;
    }

    const statusCode = MODE_TO_STATUS[computedMode] || 'unknown';

    // Update mode device if present
    if (endpoints.modeDevice) {
      await endpoints.modeDevice.act(async (agent) => {
        await (agent as any).modeSelect.setTrainStatus(statusCode);
      });
    }

    // Update temperature sensor from delay minutes (nullable supported)
    // Special case: if status is unknown and no train selected, use 999°C sentinel
    if (endpoints.tempSensor) {
      await endpoints.tempSensor.act(async (agent) => {
        const typedAgent = agent as any;
        if (statusCode === 'unknown' && status?.selectedService === null) {
          await typedAgent.temperatureMeasurement.setNoServiceTemperature();
        } else {
          await typedAgent.temperatureMeasurement.setDelayMinutes(status?.delayMinutes ?? null);
        }
      });
    }

    // Update air quality device with color-coded status if present
    if (endpoints.airQualityDevice) {
      await endpoints.airQualityDevice.act(async (agent) => {
        await (agent as any).airQuality.setTrainStatus(statusCode);
      });
    }
  } catch (error) {
    const err = error as Error;
    log.error(`Error updating Matter endpoints: ${err.message}`);
  }
}

/**
 * Set friendly labels on all endpoints.
 *
 * Logs a warning if label setting fails but doesn't throw.
 */
export async function setEndpointLabels(
  endpoints: {
    tempSensor?: Endpoint;
    modeDevice?: Endpoint;
    airQualityDevice?: Endpoint;
  },
  labels: {
    delayDeviceName?: string;
    statusDeviceName?: string;
    airQualityDeviceName?: string;
  }
): Promise<void> {
  const log = loggers.matter;

  try {
    const { setEndpointName } = await import('./matterHelpers.js');

    if (endpoints.tempSensor) {
      await setEndpointName(endpoints.tempSensor, labels.delayDeviceName ?? 'Train Delay');
    }
    if (endpoints.modeDevice) {
      await setEndpointName(endpoints.modeDevice, labels.statusDeviceName ?? 'Train Status');
    }
    if (endpoints.airQualityDevice) {
      await setEndpointName(
        endpoints.airQualityDevice,
        labels.airQualityDeviceName ?? 'Train Air Quality'
      );
    }
    log.info('   ✓ Endpoint labels set');
  } catch (e) {
    const error = e as Error;
    log.warn(`⚠️ Could not set endpoint labels: ${error.message}`);
  }
}
