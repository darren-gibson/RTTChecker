# Testing with Google Home Nest Display

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
- Device shows as ON when train is on time/minor delay
- Device shows as OFF when delayed/major delay/unknown
- State updates automatically every minute

**Voice Control:**
- "Hey Google, is Train Status on?"
- "Hey Google, turn on/off Train Status" (doesn't do anything useful, but works)

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

### State Mapping

The device uses **On/Off state** for Google Home compatibility:

| Train Status | Mode | Google Home State |
|--------------|------|-------------------|
| On Time (≤2 min late) | 0 | ON |
| Minor Delay (3-5 min) | 1 | ON |
| Delayed (6-10 min) | 2 | OFF |
| Major Delay (>10 min) | 3 | OFF |
| Unknown (no train) | 4 | OFF |

**Why On/Off instead of modes?**
Google Home has better support for simple on/off devices than multi-mode devices. This gives the most reliable experience.

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

# Run with env vars
docker run -d \
  --name train-status \
  --network host \
  -e RTT_USER="$RTT_USER" \
  -e RTT_PASS="$RTT_PASS" \
  train-status
```

**Note:** `--network host` is required for mDNS discovery

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
