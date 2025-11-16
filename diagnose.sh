#!/usr/bin/env bash
# Diagnose Matter commissioning issues

echo "🔍 Matter Commissioning Diagnostic"
echo "=================================="
echo ""

# Check if device is commissioned
echo "1️⃣  Checking commissioning state..."
if [ -d ".matter-storage" ] && [ -f ".matter-storage/0.FabricManager.fabrics" ]; then
  FABRIC_COUNT=$(cat .matter-storage/0.FabricManager.fabrics | grep -o "fabricIndex" | wc -l | xargs)
  echo "   ⚠️  Device IS commissioned ($FABRIC_COUNT fabric(s))"
  echo "   → Run ./reset-commissioning.sh to clear and try again"
else
  echo "   ✓ Device NOT commissioned (ready for pairing)"
fi
echo ""

# Check network interfaces
echo "2️⃣  Checking network interfaces..."
if command -v ifconfig &> /dev/null; then
  ACTIVE_IFS=$(ifconfig | grep -E "^[a-z]" | grep -v "lo0" | cut -d: -f1 | xargs)
  echo "   Active interfaces: $ACTIVE_IFS"
  
  # Show IP addresses
  for iface in $ACTIVE_IFS; do
    IP=$(ifconfig $iface | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    if [ ! -z "$IP" ]; then
      echo "   $iface: $IP"
    fi
  done
else
  echo "   ℹ️  ifconfig not available"
fi
echo ""

# Check if ports are available
echo "3️⃣  Checking required ports..."
if command -v lsof &> /dev/null; then
  PORT_5353=$(lsof -i UDP:5353 -sTCP:LISTEN 2>/dev/null | grep -v COMMAND || true)
  PORT_5540=$(lsof -i UDP:5540 -sTCP:LISTEN 2>/dev/null | grep -v COMMAND || true)
  
  if [ -z "$PORT_5353" ]; then
    echo "   ✓ Port 5353 (mDNS) available"
  else
    echo "   ⚠️  Port 5353 (mDNS) in use:"
    echo "$PORT_5353" | sed 's/^/      /'
  fi
  
  if [ -z "$PORT_5540" ]; then
    echo "   ✓ Port 5540 (Matter) available"
  else
    echo "   ⚠️  Port 5540 (Matter) in use:"
    echo "$PORT_5540" | sed 's/^/      /'
  fi
else
  echo "   ℹ️  lsof not available - cannot check ports"
fi
echo ""

# Check mDNS service (macOS)
echo "4️⃣  Checking mDNS service (macOS)..."
if [ -f "/System/Library/LaunchDaemons/com.apple.mDNSResponder.plist" ]; then
  if launchctl list | grep -q "com.apple.mDNSResponder"; then
    echo "   ✓ mDNSResponder is running"
  else
    echo "   ⚠️  mDNSResponder NOT running"
  fi
else
  echo "   ℹ️  Not macOS or mDNSResponder not found"
fi
echo ""

# Check Avahi (Linux)
echo "5️⃣  Checking Avahi daemon (Linux)..."
if command -v systemctl &> /dev/null; then
  if systemctl is-active --quiet avahi-daemon; then
    echo "   ✓ avahi-daemon is running"
  else
    echo "   ⚠️  avahi-daemon NOT running"
    echo "   → Try: sudo systemctl start avahi-daemon"
  fi
else
  echo "   ℹ️  systemctl not available - skipping"
fi
echo ""

# Firewall check (macOS)
echo "6️⃣  Checking firewall (macOS)..."
if command -v /usr/libexec/ApplicationFirewall/socketfilterfw &> /dev/null; then
  FW_STATUS=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate | awk '{print $3}')
  if [ "$FW_STATUS" = "enabled." ]; then
    echo "   ⚠️  Firewall is enabled - may block mDNS"
    echo "   → Temporarily disable: sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off"
  else
    echo "   ✓ Firewall is disabled"
  fi
else
  echo "   ℹ️  Not macOS or firewall tool not available"
fi
echo ""

# Summary
echo "=================================="
echo "📋 Summary & Next Steps:"
echo ""
echo "If device won't pair:"
echo "  1. Run ./reset-commissioning.sh to clear old pairings"
echo "  2. Ensure phone and computer on SAME WiFi (not guest network)"
echo "  3. Disable VPN on phone"
echo "  4. Check firewall allows UDP 5353, 5540"
echo "  5. Restart both Google Home app and this server"
echo ""
echo "Still not working?"
echo "  • Try 'npm start' and watch for errors"
echo "  • Check Google Home app device list for old entry"
echo "  • Restart Google Home Hub/speaker if using one"
echo ""
