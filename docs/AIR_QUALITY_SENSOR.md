# Air Quality Sensor for Train Status

## Overview

This implementation adds an **Air Quality Sensor** endpoint to visualize train punctuality status using color-coded air quality levels in Google Home. This provides a more intuitive and visually rich status representation compared to numeric temperature or mode values.

## Why Air Quality Sensor?

The Air Quality Sensor offers several advantages:

1. **Color-Coded Visualization**: Google Home displays air quality with color-coded badges:
   - **Green** (Good): Train is on time
   - **Yellow** (Fair): Minor delay
   - **Orange** (Moderate): Delayed
   - **Red** (Poor): Major delay
   - **Dark Red** (Very Poor): Unknown/Critical status

2. **Intuitive Status Mapping**: Air quality levels naturally map to service quality:
   - Better air quality = Better train service
   - Worse air quality = Worse train punctuality

3. **Rich Enum Support**: Matter's `AirQualityEnum` provides 6-7 distinct levels:
   - `Unknown` (0)
   - `Good` (1)
   - `Fair` (2)
   - `Moderate` (3)
   - `Poor` (4)
   - `VeryPoor` (5)
   - `ExtremelyPoor` (6) - optional, feature-gated

4. **Google Home Integration**: Maps to `action.devices.traits.SensorState` with automatic visual formatting

## Implementation Details

### Custom Behavior Class

```javascript
class TrainStatusAirQualityServer extends AirQualityServer {
  async initialize() {
    this.state.airQuality = 0; // AirQualityEnum.Unknown
    await super.initialize?.();
  }

  async setTrainStatus(statusCode) {
    const STATUS_TO_AIR_QUALITY = {
      on_time: 1,      // Good - Green
      minor_delay: 2,  // Fair - Yellow
      delayed: 3,      // Moderate - Orange
      major_delay: 4,  // Poor - Red
      unknown: 5,      // VeryPoor - Dark Red
      critical: 5,     // VeryPoor - Dark Red
    };

    const airQualityValue = STATUS_TO_AIR_QUALITY[statusCode] ?? 0;
    await this.setAirQuality(airQualityValue);
  }
}
```

### Status Mapping

| Train Status | Delay Range | Air Quality Level | Color in Google Home |
|--------------|-------------|-------------------|---------------------|
| On Time | 0-2 minutes | Good (1) | Green |
| Minor Delay | 3-5 minutes | Fair (2) | Yellow |
| Delayed | 6-10 minutes | Moderate (3) | Orange |
| Major Delay | 11+ minutes | Poor (4) | Red |
| Unknown/Critical | N/A | VeryPoor (5) | Dark Red |

### Device Type

- **Matter Device Type**: AirQualitySensor (0x2C)
- **Revision**: 1
- **Required Clusters**: Identify, AirQuality
- **Optional Clusters**: TemperatureMeasurement, RelativeHumidityMeasurement

### Endpoint Configuration

The air quality sensor is added as endpoint #3:

```javascript
const airQualityDevice = await addEndpoint(
  node, 
  AirQualitySensorDevice, 
  [TrainStatusAirQualityServer, UserLabelServer, FixedLabelServer],
  { id: 'airquality', number: 3 }
);
```

### Event Wiring

The air quality sensor updates automatically when train status changes:

```javascript
trainDevice.on('statusChange', async (status) => {
  const statusCode = MODE_TO_STATUS[computedMode] || 'unknown';
  
  await airQualityDevice.act(async (agent) => {
    await agent.airQuality.setTrainStatus(statusCode);
  });
});
```

## Google Home Display

When commissioned in Google Home, the air quality sensor appears as:

- **Device Name**: "Train Air Quality"
- **Device Type**: Air Quality Sensor
- **Display**: Color-coded status badge
- **Voice Commands**: 
  - "What's the air quality of Train Air Quality?"
  - "Is Train Air Quality good or bad?"

## Comparison with Other Approaches

| Device Type | Pros | Cons |
|-------------|------|------|
| **Temperature Sensor** | Simple numeric value | No visual differentiation |
| **Mode Select** | Text labels | Google Home shows as dropdown menu |
| **Fan Control** | Speed presets | Confusing metaphor for train status |
| **Air Quality Sensor** | ✓ Color-coded visualization<br>✓ Intuitive metaphor<br>✓ Rich enum support | Requires re-commissioning if replacing existing device |

## Testing

To test the air quality sensor:

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Commission to Google Home**:
   - Scan the QR code displayed in terminal
   - Follow Google Home app prompts
   - Device appears as "Train Air Quality"

3. **Verify status updates**:
   - Wait for periodic train status refresh (every 60 seconds)
   - Or trigger manual status change by modifying train service
   - Check Google Home app for color changes

4. **Voice queries**:
   - "Hey Google, what's the air quality?"
   - Check response for status level

## Future Enhancements

1. **Additional Optional Clusters**: Add RelativeHumidityMeasurement to represent service reliability percentage
2. **ExtremelyPoor Level**: Enable feature for extremely severe delays (60+ minutes)
3. **Historical Tracking**: Log air quality changes over time
4. **Threshold Alerts**: Notify when air quality (train punctuality) drops below threshold

## Technical Notes

- The Air Quality cluster's `airQuality` attribute is a `TlvEnum<AirQualityEnum>`
- Default value is `Unknown` (0) until first status update
- Matter.js v0.15 AirQualityServer behavior provides full cluster implementation
- No additional features need to be enabled (unlike FanControl.MultiSpeed)
- Color coding is handled automatically by Google Home based on enum value
