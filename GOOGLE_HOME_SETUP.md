# Testing with Google Home (Nest Hub / App)

## Quick Start

### 1. Set Up Environment Variables

Create a `.env` file or export these variables:

```bash
# Required: RTT API credentials
export RTT_USER="your_rtt_username"
export RTT_PASS="your_rtt_password"

# Optional: Train route (defaults shown)
export ORIGIN_TIPLOC="CAMBDGE"    # Cambridge
export DEST_TIPLOC="KNGX"         # London Kings Cross
export MIN_AFTER_MINUTES=20       # Check trains 20+ mins from now
export WINDOW_MINUTES=60          # Within next 60 minutes

# Optional: Matter device settings (defaults shown)
export DEVICE_NAME="Train Status"
export DISCRIMINATOR=3840
export PASSCODE=20202021
export UPDATE_INTERVAL_MS=60000   # Update every 60 seconds

# Optional: Per-endpoint custom names (defaults derive from ORIGIN_TIPLOC-DEST_TIPLOC)
# If unset, names will be automatically generated like:
#   <ORIGIN>-<DEST> Train Status
#   <ORIGIN>-<DEST> Train Delay
export STATUS_DEVICE_NAME="CAMBDGE-KNGX Train Status"
export DELAY_DEVICE_NAME="CAMBDGE-KNGX Train Delay"
```

### 2. Start the Device

```bash
npm start
```

You'll see output like this:

```
🚆 Starting Matter Train Status Device...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Device Information:
  Name: Train Status
  Vendor: RTT Devices
  Product: Train Status Monitor
  Serial: TSM-ABC123

📡 Matter server created
   Discriminator: 3840
   Passcode: 20202021

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 COMMISSION THIS DEVICE WITH GOOGLE HOME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  Open Google Home app on your phone
2️⃣  Tap + → Add device → New device
3️⃣  Select your home
4️⃣  Scan this QR code:

[QR CODE DISPLAYED HERE]

   OR enter manual pairing code: 34970112332

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Matter server started and ready for commissioning
   Waiting for Google Home to connect...

🎯 Device ready! Monitor train status updates below:
```

### 3. Commission with Google Home

**On Your Phone:**

1. Open the **Google Home** app
2. Tap the **+** button (top left)
3. Select **Add device** → **New device**
4. Choose your home
5. Wait for scanning...
6. When device appears, tap it
7. Scan the **QR code** from the terminal
   - OR tap "Set up without QR code" and enter manual code

**On First Pairing:**
- You may be prompted to allow network access
- Google Home will commission the device (takes ~30 seconds)
- Device appears as "Train Status" in your home

### 4. Verify It's Working

**In Terminal:**
You'll see updates like:
```
🔄 Train status changed: 4 -> 0 (on_time)
💡 Device state: ON (on time)
```

**In Google Home App:**
- You should see TWO endpoints/devices. Default names are derived from the route:
  - `<ORIGIN>-<DEST> Train Status` (or your `STATUS_DEVICE_NAME` override) – Mode Select with 5 modes
  - `<ORIGIN>-<DEST> Train Delay` (or your `DELAY_DEVICE_NAME` override) – Temperature Sensor showing numeric delay
- If you set `STATUS_DEVICE_NAME` / `DELAY_DEVICE_NAME`, those custom names appear instead of the derived defaults.
- The Temperature Sensor value equals minutes delayed (negative = early, 0 = on time)
- Values update automatically every minute
- Endpoints are read-only (status comes from RTT updates)

### Bridge mode and names
- The app now exposes a Bridge (Aggregator) endpoint with two bridged devices under it.
- Per-endpoint names are advertised via the Bridged Device Basic Information cluster using:
   - `nodeLabel`: endpoint-specific label (Status/Delay names)
   - `productName` and `productLabel`: a friendly product identifier
- Google Home should display these bridged devices with their labels beneath a single bridge.
- If Google Home shows generic names, you can rename each bridged device in the app after commissioning.

**Voice Control (Recommended):**
- "Hey Google, what's the temperature of Train Delay Sensor?"
- "Hey Google, what's Train Delay Sensor's temperature?"
- Assign to a room and ask: "Hey Google, what's the temperature in <room>?"

Interpretation:
- 0°C = on time
- 5°C = 5 minutes late
- -3°C = 3 minutes early

### 5. Create Automations

**Example: Alert on Delay**
1. Google Home app → Automations
2. When: Train Status turns OFF
3. Then: Send notification "Train is delayed!"

**Example: All Clear Light**
1. When: Train Status turns ON
2. Then: Turn living room light green

## Troubleshooting

### Device Won't Commission

**Check Network:**
- Device and phone must be on same network
- Firewall may block mDNS (port 5353)
- Try disabling VPN

**Reset Commissioning:**
```bash
# Stop the device (Ctrl+C)
# Delete storage
rm -rf .matter-storage/
# Restart
npm start
```

### Device Shows as Offline

**Check Process:**
```bash
# Device must be running continuously
npm start
# Keep terminal open or run in background
```

**Check Logs:**
Look for errors in terminal output

### Status Not Updating

**Verify RTT Credentials:**
```bash
# Test API access
curl -u "$RTT_USER:$RTT_PASS" \
  "https://api.rtt.io/api/v1/json/search/CAMBDGE/to/KNGX"
```

**Check Train Parameters:**
- Ensure `ORIGIN_TIPLOC` and `DEST_TIPLOC` are valid
- Verify trains run during current time
- Check `MIN_AFTER_MINUTES` isn't too large

### Device Endpoints & Mapping

- Mode Select endpoint shows the discrete status (On Time / Minor / Delayed / Major / Unknown)
- Temperature Sensor endpoint shows numeric delay with a simple mapping:
   - Temperature (°C) = Minutes delayed
   - Negative values = minutes early
   - Range capped to -10°C … 50°C

## Advanced Configuration

### Running in Background

**Using PM2:**
```bash
npm install -g pm2
pm2 start index.js --name train-status
pm2 logs train-status
pm2 stop train-status
```

**Using systemd (Linux):**
```bash
# Create /etc/systemd/system/train-status.service
sudo systemctl enable train-status
sudo systemctl start train-status
sudo journalctl -u train-status -f
```

### Docker Deployment

```bash
# Build image
docker build -t train-status .

# Run with env vars (MUST use --network host for Matter/mDNS)
docker run -d \
  --name train-status \
  --network host \
  -e RTT_USER="$RTT_USER" \
  -e RTT_PASS="$RTT_PASS" \
  -e ORIGIN_TIPLOC="CAMBDGE" \
  -e DEST_TIPLOC="KNGX" \
  train-status
```

**Important:** `--network host` is **required** for Matter commissioning because:
- Matter uses UDP port 5540 for device communication
- mDNS uses UDP port 5353 for device discovery
- Bridge networking breaks mDNS multicast packets
- Without host networking, Google Home won't discover the device

### Custom Update Interval

```bash
# Update every 30 seconds instead of 60
export UPDATE_INTERVAL_MS=30000
npm start
```

## Testing Tips

### Multiple Devices

To run multiple instances (different routes):
```bash
# Terminal 1: Cambridge → London
export DEVICE_NAME="Cambridge Train"
export DISCRIMINATOR=3840
export ORIGIN_TIPLOC="CAMBDGE"
export DEST_TIPLOC="KNGX"
npm start

### Device Naming

Each instance exposes two Matter endpoints whose names are either derived from your route or overridden by environment variables:

Derived defaults:
- `<ORIGIN_TIPLOC>-<DEST_TIPLOC> Train Status`
- `<ORIGIN_TIPLOC>-<DEST_TIPLOC> Train Delay`

Override with:
```bash
export STATUS_DEVICE_NAME="Cambridge-London Train Status"
export DELAY_DEVICE_NAME="Cambridge-London Train Delay"
```

Guidelines:
- Keep names unique across simultaneous instances to avoid confusion in controllers.
- Shorter names improve voice commands (you can further rename inside Google Home).
- Avoid emojis or special characters if a controller strips them.

Example two-route setup:
```bash
# Cambridge → London
export ORIGIN_TIPLOC=CAMBDGE
export DEST_TIPLOC=KNGX
export STATUS_DEVICE_NAME="C→L Status"
export DELAY_DEVICE_NAME="C→L Delay"
npm start

# (Second terminal) London → Cambridge
export ORIGIN_TIPLOC=KNGX
export DEST_TIPLOC=CAMBDGE
export STATUS_DEVICE_NAME="L→C Status"
export DELAY_DEVICE_NAME="L→C Delay"
npm start
```

# Terminal 2: London → Cambridge  
export DEVICE_NAME="London Train"
export DISCRIMINATOR=3841  # Must be different!
export PASSCODE=20202022   # Must be different!
export ORIGIN_TIPLOC="KNGX"
export DEST_TIPLOC="CAMBDGE"
npm start
```

### Viewing Matter Communication

**Enable debug logging:**
```bash
export MATTER_LOG_LEVEL=debug
npm start
```

### Simulating Status Changes

For testing automations without waiting for real trains:
```javascript
// Temporarily modify src/MatterDevice.js updateTrainStatus()
// to return different statuses manually
```

## Next Steps

✅ Device is commissioned and working!

Now you can:
- Create automations based on train status
- Monitor status from anywhere via Google Home app
- Set up notifications for delays
- Integrate with other smart home devices

---

**Need Help?**
- Check `README.md` for device architecture details
- Review `tests/` folder for behavior examples
- Enable debug logging for detailed output
