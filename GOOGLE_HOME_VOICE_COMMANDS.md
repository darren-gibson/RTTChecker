# Using Train Status Device with Google Home

## Voice Commands

Google Home's support for Mode Select devices varies. Here are the commands you can try:

### Basic Status Check
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

## Checking Current Status

### Via Google Home App (Most Reliable)
1. Open **Google Home** app
2. Navigate to **Devices**
3. Find **"Train Status"**
4. Tap to view → Current mode displayed prominently

### Via Voice (May be Limited)
```
"Hey Google, what's Train Status set to?"
"Hey Google, read Train Status"
```

If voice commands don't work well, this is a known limitation of Google Home's current Mode Select implementation.

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
