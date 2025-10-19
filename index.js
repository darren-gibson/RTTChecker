import express from "express";
import { getTrainStatus } from "./src/RTTBridge.js";
import { AirQualityState, GoogleHomeApi } from "./src/constants.js";
import { config, isTestEnv } from "./src/config.js";

const app = express();
app.use(express.json());

app.post("/smarthome", async (req, res) => {
  const intent = req.body?.inputs?.[0]?.intent;
  const requestId = req.body?.requestId || "req";
  
  if (intent === GoogleHomeApi.Intent.SYNC) {
    return res.json({
      requestId,
      payload: {
        agentUserId: config.googleHome.agentUserId,
        devices: [{
          id: config.googleHome.deviceId,
          type: GoogleHomeApi.DeviceType.SENSOR,
          traits: [GoogleHomeApi.Trait.SENSOR_STATE],
          name: { name: config.googleHome.deviceName },
          willReportState: true,
          attributes: {
            sensorStatesSupported: [{
              name: GoogleHomeApi.SensorName.AIR_QUALITY,
              descriptiveCapabilities: { 
                availableStates: Object.values(AirQualityState)
              }
            }]
          }
        }]
      }
    });
  }

  if (intent === GoogleHomeApi.Intent.QUERY) {
    try {
      const result = await getTrainStatus({
        originTiploc: config.train.originTiploc,
        destTiploc: config.train.destTiploc,
        minAfterMinutes: config.train.minAfterMinutes,
        windowMinutes: config.train.windowMinutes,
        now: new Date()
      });

      return res.json({
        requestId,
        payload: {
          devices: {
            [config.googleHome.deviceId]: {
              status: GoogleHomeApi.Status.SUCCESS,
              online: true,
              currentSensorStateData: [{
                name: GoogleHomeApi.SensorName.AIR_QUALITY,
                currentSensorState: result.lateness
              }]
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

// Export app for testing
export { app };

// Start server only when not in test environment
if (!isTestEnv()) {
  app.listen(config.server.port, () => {
    console.log(`RTT bridge listening on :${config.server.port}`);
  });
}
