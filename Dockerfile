# Use official Node.js LTS image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Set environment variable for production
ENV NODE_ENV=production

# Cloud Run sets PORT dynamically
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Start the server
CMD ["node", "index.js"]
