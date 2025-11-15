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

# Note: Set RTT_USER, RTT_PASS, ORIGIN_TIPLOC, DEST_TIPLOC via secrets/env
# Cloud Run sets PORT dynamically (though Matter doesn't use HTTP)
ENV PORT=8080

# Expose the port (for debugging/health checks if needed)
EXPOSE 8080

# Start the Matter device
CMD ["node", "index.js"]
