# Use official Node.js LTS image
FROM node:22-alpine

# Install build dependencies for Matter.js native modules
# python3, make, g++ are required for building native Node.js addons
# iproute2 provides network utilities for diagnostics
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    iproute2

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Set environment variable for production
ENV NODE_ENV=production

# Matter device configuration defaults
ENV DEVICE_NAME="Train Status"
ENV UPDATE_INTERVAL_MS=60000

# Note: Set RTT_USER, RTT_PASS, ORIGIN_TIPLOC, DEST_TIPLOC via environment variables

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Matter Protocol Requirements:
# - UDP port 5540 (Matter commissioning/communication)
# - UDP port 5353 (mDNS for device discovery via Matter.js built-in mDNS)
# - Container MUST be run with --network host for mDNS to work on Linux
# - EXPOSE directives are not used because host networking bypasses them
# 
# Note: On macOS/Windows, Podman runs in a VM so --network host does NOT
# provide access to the actual host network. Run directly with Node.js instead.

# Use entrypoint for any initialization
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "index.js"]
