import express from "express";
import { rttSearch, pickNextService, mapLatenessToState } from "./src/RTTBridge.js";

const app = express();
app.use(express.json());

const ORIGIN_CRS = process.env.ORIGIN_CRS || "CBG";
const AFTER = process.env.AFTER || "0700";
const DATE = () => new Date().toISOString().slice(0,10);

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
      const data = await rttSearch(ORIGIN_CRS, DATE().replaceAll('-', '/'));
      const svc = pickNextService(data?.services || [], AFTER);
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
