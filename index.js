import express from "express";
import { rttSearch, pickNextService, mapLatenessToState } from "./src/RTTBridge.js";

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
    const data = await rttSearch(ORIGIN_TIPLOC, DEST_TIPLOC, DATE().replaceAll('-', '/'));
  const svc = pickNextService(data?.services || [], DEST_TIPLOC, { minAfterMinutes: MIN_AFTER_MINUTES, windowMinutes: WINDOW_MINUTES });
      const loc = svc?.locationDetail;
      const late = loc ? Number(loc.realtimeGbttDepartureLateness ?? loc.realtimeWttDepartureLateness ?? 0) : null;
      const current = mapLatenessToState(late);

      return res.json({
        requestId,
        payload: {
          devices: {
            "train_1": {
              status: "SUCCESS",
              online: true,
              currentSensorStateData: [{ name: "AirQuality", currentSensorState: current }]
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`RTT bridge listening on :${PORT}`));
