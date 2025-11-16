# Use official Node.js LTS image
FROM node:22-alpine

# Install dependencies for Matter.js (may need additional libraries)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    avahi-dev \
    avahi-compat-libdns_sd

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

# Matter Protocol Requirements:
# - UDP port 5540 (Matter commissioning/communication)
# - UDP port 5353 (mDNS for device discovery)
# - Container MUST be run with --network host for mDNS to work
# - EXPOSE directives are not used because host networking bypasses them

# Start the Matter device
CMD ["node", "index.js"]
