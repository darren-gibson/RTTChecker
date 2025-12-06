import { TemperatureSensorDevice } from '@matter/main/devices/temperature-sensor';
import { ModeSelectDevice } from '@matter/main/devices/mode-select';

import { addEndpoint } from './matterHelpers.js';

// Creates temperature and mode endpoints with provided behaviors and explicit ids
export async function createEndpoints(node, { tempBehaviors, modeBehaviors }) {
  const tempSensor = await addEndpoint(node, TemperatureSensorDevice, tempBehaviors, {
    id: 'temperature',
    number: 1,
  });

  const modeDevice = await addEndpoint(node, ModeSelectDevice, modeBehaviors, {
    id: 'mode',
    number: 2,
  });

  return { tempSensor, modeDevice };
}
