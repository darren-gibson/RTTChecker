#!/bin/sh
set -e

# Matter.js handles mDNS directly when using --network host
# No additional daemons required

# Show network info for debugging
echo "Container network interfaces:"
ip addr show 2>/dev/null | grep -E "^[0-9]+:|inet " || echo "Could not determine network interfaces"

echo "Starting Matter device..."
# Execute the main command (node index.js)
exec "$@"
