# Use official Node.js LTS image (Node 24)
# Pin Alpine via build-arg for easier security updates
ARG ALPINE_VERSION=3.21
FROM node:24-alpine${ALPINE_VERSION}

# Install build dependencies for Matter.js native modules
# python3, make, g++ are required for building native Node.js addons
# iproute2 provides network utilities for diagnostics
# Upgrade base packages to receive latest security patches in the base image
RUN apk update && apk upgrade --no-cache && apk add --no-cache \
    python3 \
    make \
    g++ \
    iproute2

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy TypeScript source and config files
COPY tsconfig.json ./
COPY index.ts ./
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Set environment variable for production
ENV NODE_ENV=production

# Matter device configuration defaults
ENV DEVICE_NAME="Train Status"
ENV UPDATE_INTERVAL_MS=60000

# Note: Set RTT_USER, RTT_PASS, ORIGIN_TIPLOC, DEST_TIPLOC via environment variables

# Copy entrypoint script (from docker/ subdirectory in build context)
COPY docker/docker-entrypoint.sh /usr/local/bin/
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
# Run the compiled JavaScript from dist/
CMD ["node", "dist/index.js"]
