# Using Train Status Devices with Google Home

## Voice Commands

This project exposes TWO Matter endpoints in Google Home:
- "Train Status" (Mode Select) — shows On Time / Minor Delay / Delayed / Major Delay / Unknown
- "Train Delay Sensor" (Temperature Sensor) — shows numeric delay in minutes via temperature value

Google Home's voice support for Mode Select is limited, but the Temperature Sensor works great for voice queries.

### Ask for Numeric Delay (Recommended)
These commands read the Temperature Sensor value, which equals minutes delayed:
```
"Hey Google, what's the temperature of Train Delay Sensor?"
"Hey Google, what's Train Delay Sensor's temperature?"
"Hey Google, what's the temperature in <room>?"  (if the sensor is assigned to a room)
```

How to interpret:
- 0°C = on time
- 5°C = 5 minutes late
- 20°C = 20 minutes late
- -3°C = 3 minutes early (negative values mean early)

Tip: You can rename the device in Google Home to "Train Delay" for shorter phrases:
```
"Hey Google, what's the temperature of Train Delay?"

### Custom Names
If you set `STATUS_DEVICE_NAME` or `DELAY_DEVICE_NAME` before starting the server, those names appear instead of defaults (which derive from `<ORIGIN>→<DEST>`). Use short names to reduce friction in voice phrases:
```
export STATUS_DEVICE_NAME="Cambridge→London Status"
export DELAY_DEVICE_NAME="Cambridge→London Delay"
```
Then you can ask:
```
"Hey Google, what's the temperature of Cambridge→London Delay?"
```
Inside the Google Home app you can still rename endpoints locally without changing environment variables.
```

### Check Status (Mode Select)
Basic status commands for the Mode Select endpoint:
```
"Hey Google, what's the status of Train Status?"
"Hey Google, what mode is Train Status in?"
"Hey Google, check Train Status"
```

### Direct Device Query
```
"Hey Google, is Train Status on time?"
"Hey Google, what's the train status?"
```

### Google Home App
The most reliable way is through the **Google Home app**:

1. Open Google Home app
2. Find "Train Status" in your devices
3. Tap the device to see current mode
4. Current mode will show as one of:
   - "On Time"
   - "Minor Delay"
   - "Delayed"
   - "Major Delay"
   - "Unknown"

## Current Limitations

**Mode Select Support**: Google Home's voice assistant has limited support for Mode Select devices. You may find:

- ❌ Google Assistant might not recognize mode-specific queries
- ❌ May only show as a generic Matter device
- ❌ Voice commands might be limited to "turn on/off" (which won't work for read-only devices)
- ✅ Google Home **app** reliably shows current mode
- ✅ Mode changes are visible in the app in real-time
- ✅ Temperature Sensor works well with voice, and its value equals minutes delayed

## Alternative: Add Automations

The best way to use this device with Google Home is through **routines/automations**:

### Create a Routine
1. Open Google Home app
2. Go to **Automations** → **Add**
3. Set starter:
   - **"When I say..."** → "What's my train status?"
4. Add action:
   - **Adjust home devices** → Select "Train Status"
   - **Announce** → "Train is [mode]"

### Mode-Based Automation Examples

**Alert on Delay:**
```
Starter: When Train Status changes to "Delayed" or "Major Delay"
Action:  Send notification to phone
         OR Announce "Your train is delayed"
```

**Morning Check:**
```
Starter: Every weekday at 7:00 AM
Action:  Check Train Status
         Announce current mode
```

**Smart Light Indicator:**
```
Starter: When Train Status is "On Time"
Action:  Turn hallway light green

Starter: When Train Status is "Delayed" or "Major Delay"  
Action:  Turn hallway light red
```

### Numeric (Temperature) Automation Examples

Use the Temperature Sensor for numeric thresholds (minutes delayed):
```
Starter: When Train Delay Sensor temperature rises above 10°C
Action:  Send notification "Train is >10 minutes late"

Starter: When Train Delay Sensor temperature falls below 0°C
Action:  Announce "Train is on time or early"
```

## Checking Current Status

### Via Google Home App (Most Reliable)
1. Open **Google Home** app
2. Navigate to **Devices**
3. Find **"Train Status"**
4. Tap to view → Current mode displayed prominently

### Via Voice (Mode Select may be Limited)
```
"Hey Google, what's Train Status set to?"
"Hey Google, read Train Status"
```

If voice commands don't work well for modes, this is a known limitation of Google Home's current Mode Select implementation. Use the Temperature Sensor instead for a reliable, voice-friendly numeric delay.

## Better Controller Options

If Google Home's Mode Select support is insufficient, consider:

1. **Apple Home** - Better Mode Select visualization
2. **Home Assistant** - Full Matter Mode Select support with custom UI
3. **SmartThings** - Good Matter device support
4. **Amazon Alexa** - Moderate Mode Select support

## Testing Device Connection

To verify the device is properly connected:

1. **Check commissioning:**
   ```bash
   npm start
   ```
   Look for: "Successfully created subscription"

2. **Check logs for mode updates:**
   ```
   🚆 Train status: [mode name] (mode X)
   ```

3. **In Google Home app:**
   - Device should appear online
   - Mode value should change every 60 seconds (if train data updates)

## Troubleshooting

**Device shows as offline:**
- Restart the Node.js app
- Check that device is on same network as Google Home

**Mode doesn't update:**
- Check RTT credentials are set
- Look for "RTT 401" errors in terminal
- Verify train route is configured correctly

**Voice commands don't work:**
- Use Google Home app instead
- Create custom routines with specific phrases
- Consider using automations based on mode changes

## Future Improvements

Google is continuously improving Matter support. In future updates, you may see:
- Better voice command recognition for Mode Select
- Native mode name announcements
- Improved device categorization
