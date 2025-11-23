#!/bin/bash
# Podman troubleshooting script for RTTChecker Matter device discovery

set -e

CONTAINER_NAME="${1:-train-status}"

echo "=== RTTChecker Podman Troubleshooting ==="
echo ""

# Check if container is running
echo "1. Checking container status..."
if podman ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "   ✓ Container '${CONTAINER_NAME}' is running"
else
    echo "   ✗ Container '${CONTAINER_NAME}' is not running"
    echo "   Run: podman start ${CONTAINER_NAME}"
    exit 1
fi

# Check Avahi daemon
echo ""
echo "2. Checking Avahi daemon inside container..."
if podman exec "${CONTAINER_NAME}" pgrep -x avahi-daemon > /dev/null 2>&1; then
    echo "   ✓ Avahi daemon is running"
    AVAHI_PID=$(podman exec "${CONTAINER_NAME}" pgrep -x avahi-daemon)
    echo "   PID: ${AVAHI_PID}"
else
    echo "   ✗ Avahi daemon is NOT running"
    echo "   This will prevent mDNS discovery"
    echo "   Try restarting: podman restart ${CONTAINER_NAME}"
fi

# Check network mode
echo ""
echo "3. Checking network configuration..."
NETWORK_MODE=$(podman inspect "${CONTAINER_NAME}" --format '{{.HostConfig.NetworkMode}}')
if [ "${NETWORK_MODE}" = "host" ]; then
    echo "   ✓ Using host networking (required for Matter)"
else
    echo "   ✗ Network mode: ${NETWORK_MODE}"
    echo "   WARNING: Must use --network host for mDNS discovery"
fi

# Check capabilities
echo ""
echo "4. Checking container capabilities..."
CAPS=$(podman inspect "${CONTAINER_NAME}" --format '{{.EffectiveCapNames}}')
if echo "${CAPS}" | grep -q "NET_ADMIN" && echo "${CAPS}" | grep -q "NET_RAW"; then
    echo "   ✓ NET_ADMIN and NET_RAW capabilities present"
else
    echo "   ⚠ Missing network capabilities"
    echo "   Consider adding: --cap-add=NET_ADMIN --cap-add=NET_RAW"
fi

# Check if Matter ports are accessible
echo ""
echo "5. Checking if Matter/mDNS ports are in use..."
if command -v ss > /dev/null 2>&1; then
    if ss -ulnp | grep -q ":5353 "; then
        echo "   ✓ Port 5353 (mDNS) is in use"
    else
        echo "   ⚠ Port 5353 (mDNS) not listening"
    fi
    
    if ss -ulnp | grep -q ":5540 "; then
        echo "   ✓ Port 5540 (Matter) is in use"
    else
        echo "   ⚠ Port 5540 (Matter) not listening"
    fi
else
    echo "   ⚠ 'ss' command not available, skipping port check"
fi

# Check logs for errors
echo ""
echo "6. Recent container logs (last 20 lines)..."
echo "----------------------------------------"
podman logs --tail 20 "${CONTAINER_NAME}"
echo "----------------------------------------"

# Suggest next steps
echo ""
echo "=== Troubleshooting Steps ==="
echo ""
echo "If device is not discovered:"
echo ""
echo "1. Check firewall on host machine:"
echo "   sudo firewall-cmd --list-ports | grep -E '5353|5540'"
echo "   sudo firewall-cmd --permanent --add-port=5353/udp"
echo "   sudo firewall-cmd --permanent --add-port=5540/udp"
echo "   sudo firewall-cmd --reload"
echo ""
echo "2. Test mDNS from another device on same network:"
echo "   avahi-browse -a -t"
echo "   # Look for _matter._tcp and _matterc._udp services"
echo ""
echo "3. Check SELinux denials (Fedora/RHEL):"
echo "   sudo ausearch -m avc -ts recent"
echo ""
echo "4. Use manual pairing code (fallback):"
echo "   podman logs ${CONTAINER_NAME} | grep -A5 'MANUAL PAIRING CODE'"
echo ""
echo "5. Restart with debug logging:"
echo "   podman stop ${CONTAINER_NAME}"
echo "   podman start ${CONTAINER_NAME}"
echo "   podman logs -f ${CONTAINER_NAME}"
echo ""
