import express from "express";
import { rttSearch, pickNextService, calculateOnTimeStatus } from "./src/RTTBridge.js";

/**
 * Core business logic for getting train status
 * @param {Object} options
 * @param {string} options.originTiploc - Origin TIPLOC
 * @param {string} options.destTiploc - Destination TIPLOC
 * @param {number} [options.minAfterMinutes] - Minimum minutes after now (default 20)
 * @param {number} [options.windowMinutes] - Window size in minutes (default 60)
 * @param {Date} [options.now] - Current time (defaults to new Date()) - date is extracted from this
 * @param {function} [options.fetchImpl] - Optional fetch implementation for mocking
 * @returns {Promise<{lateness: string, selected: object, raw: object}>}
 */
export async function getTrainStatus({
  originTiploc,
  destTiploc,
  minAfterMinutes = 20,
  windowMinutes = 60,
  now,
  fetchImpl
}) {
  // Default to current time if not provided
  const currentTime = now || new Date();
  
  // Extract date from the current time
  const y = currentTime.getFullYear();
  const m = String(currentTime.getMonth() + 1).padStart(2, '0');
  const d = String(currentTime.getDate()).padStart(2, '0');
  const dateStr = `${y}/${m}/${d}`;

  const data = await rttSearch(originTiploc, destTiploc, dateStr, { fetchImpl });
  const svc = pickNextService(data?.services || [], destTiploc, { minAfterMinutes, windowMinutes, now: currentTime });
  if (!svc) {
    return { lateness: 'unknown', selected: null, raw: data };
  }
  
  const lateness = calculateOnTimeStatus(svc);
  return { lateness, selected: svc, raw: data };
}

const app = express();
app.use(express.json());

const ORIGIN_TIPLOC = process.env.ORIGIN_TIPLOC || "CAMBDGE";
const DEST_TIPLOC = process.env.DEST_TIPLOC || "KNGX";
const DATE = () => {
  // Use local date (respects BST/GMT in the UK) instead of UTC
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const MIN_AFTER_MINUTES = Number(process.env.MIN_AFTER_MINUTES || 20);
const WINDOW_MINUTES = Number(process.env.WINDOW_MINUTES || 60);

app.post("/smarthome", async (req, res) => {
  const intent = req.body?.inputs?.[0]?.intent;
  const requestId = req.body?.requestId || "req";
  if (intent === "action.devices.SYNC") {
    return res.json({
      requestId,
      payload: {
        agentUserId: "user-123",
        devices: [{
          id: "train_1",
          type: "action.devices.types.SENSOR",
          traits: ["action.devices.traits.SensorState"],
          name: { name: "My Train" },
          willReportState: true,
          attributes: {
            sensorStatesSupported: [{
              name: "AirQuality",
              descriptiveCapabilities: { availableStates: ["good","fair","poor","very poor","unknown"] }
            }]
          }
        }]
      }
    });
  }

  if (intent === "action.devices.QUERY") {
    try {
      const result = await getTrainStatus({
        originTiploc: ORIGIN_TIPLOC,
        destTiploc: DEST_TIPLOC,
        minAfterMinutes: MIN_AFTER_MINUTES,
        windowMinutes: WINDOW_MINUTES
      });

      return res.json({
        requestId,
        payload: {
          devices: {
            "train_1": {
              status: "SUCCESS",
              online: true,
              currentSensorStateData: [{ name: "AirQuality", currentSensorState: result.lateness }]
            }
          }
        }
      });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: "Unsupported intent" });
});

// Only start the server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => console.log(`RTT bridge listening on :${PORT}`));
}
