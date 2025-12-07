import { TemperatureSensorDevice } from '@matter/main/devices/temperature-sensor';
import { ModeSelectDevice } from '@matter/main/devices/mode-select';
import { AirQualitySensorDevice } from '@matter/main/devices/air-quality-sensor';
import type { ServerNode, Endpoint } from '@matter/main';

import { addEndpoint } from './matterHelpers.js';

export interface EndpointBehaviors {
  tempBehaviors: unknown[];
  modeBehaviors?: unknown[];
  airQualityBehaviors?: unknown[];
}

export interface CreatedEndpoints {
  tempSensor: Endpoint;
  modeDevice?: Endpoint;
  airQualityDevice?: Endpoint;
}

// Creates temperature, mode, and air quality endpoints with provided behaviors and explicit ids
export async function createEndpoints(
  node: ServerNode,
  { tempBehaviors, modeBehaviors, airQualityBehaviors }: EndpointBehaviors
): Promise<CreatedEndpoints> {
  const tempSensor = await addEndpoint(node, TemperatureSensorDevice, tempBehaviors, {
    id: 'temperature',
    number: 1,
  });

  const modeDevice = modeBehaviors
    ? await addEndpoint(node, ModeSelectDevice, modeBehaviors, {
        id: 'mode',
        number: 2,
      })
    : undefined;

  const airQualityDevice = airQualityBehaviors
    ? await addEndpoint(node, AirQualitySensorDevice, airQualityBehaviors, {
        id: 'airquality',
        number: 3,
      })
    : undefined;

  return { tempSensor, modeDevice, airQualityDevice };
}
