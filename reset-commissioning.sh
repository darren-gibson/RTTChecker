#!/usr/bin/env bash
# Reset Matter commissioning state
# Run this if Google Home can't discover the device

set -e

echo "🔄 Resetting Matter commissioning state..."
echo ""

if [ -d ".matter-storage" ]; then
  echo "📂 Found existing storage directory"
  echo "   This contains commissioning data from previous pairings"
  echo ""
  
  # Show fabric info if exists
  if [ -f ".matter-storage/0.FabricManager.fabrics" ]; then
    FABRIC_COUNT=$(cat .matter-storage/0.FabricManager.fabrics | grep -o "fabricIndex" | wc -l | xargs)
    echo "   • $FABRIC_COUNT fabric(s) found (commissioned controller(s))"
  fi
  
  echo ""
  read -p "❓ Delete storage and reset commissioning? (y/N) " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf .matter-storage/
    echo "✅ Storage deleted"
    echo ""
    echo "Next steps:"
    echo "1. Start the server: npm start"
    echo "2. In Google Home app: Remove old device if still listed"
    echo "3. Try adding the device again"
  else
    echo "❌ Cancelled"
  fi
else
  echo "ℹ️  No existing storage found - device is not commissioned"
  echo "   If Google Home can't discover it, check:"
  echo "   • Same WiFi network (phone and device)"
  echo "   • Firewall allows UDP ports 5353, 5540"
  echo "   • No VPN enabled on phone"
fi

echo ""
