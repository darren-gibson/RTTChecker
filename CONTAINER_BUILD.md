# Multi-Architecture Container Build Guide

## Overview
This project supports building container images for both:
- **ARM64** (Apple Silicon / local development)
- **AMD64** (x86_64 / production servers)

## Quick Start

### Build Script (Recommended)
```bash
# For local Mac development
./build-container.sh dev

# For production Linux server
./build-container.sh prod

# Build both architectures
./build-container.sh multi
```

### Manual Build
```bash
# ARM64
podman build --platform linux/arm64 -t train-status:latest-arm64 .

# AMD64
podman build --platform linux/amd64 -t train-status:latest-amd64 .
```

## Docker Compose

### Local Development (ARM64)
```bash
# Configure environment
cp .env.example .env
nano .env

# Build and run
podman-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
podman-compose logs -f train-status

# Stop
podman-compose down
```

### Production Deployment (AMD64)
```bash
# On Mac: Build AMD64 image
./build-container.sh prod

# Export image
podman save train-status:latest-amd64 | gzip > train-status-amd64.tar.gz

# Transfer to Linux server
scp train-status-amd64.tar.gz user@server:/path/

# On server: Load image
podman load < train-status-amd64.tar.gz

# On server: Run with compose
podman-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Files

- `docker-compose.yml` - Base configuration
- `docker-compose.dev.yml` - ARM64 override for local dev
- `docker-compose.prod.yml` - AMD64 override for production
- `build-container.sh` - Convenience build script
- `.env.example` - Environment variable template

## Architecture Selection

The compose override files specify the target architecture:
- `docker-compose.dev.yml` → `train-status:latest-arm64`
- `docker-compose.prod.yml` → `train-status:latest-amd64`

## Important Notes

### macOS Limitations
- Podman on macOS runs in a VM
- `--network host` doesn't provide true host networking
- **For local testing**: Run directly with `node index.js`
- **For production**: Deploy container to Linux server

### Image Naming
- ARM64: `train-status:latest-arm64`
- AMD64: `train-status:latest-amd64`

Using separate tags prevents confusion and allows both to coexist.

## Troubleshooting

### Check built images
```bash
podman images | grep train-status
```

### Verify architecture
```bash
podman inspect train-status:latest-amd64 | grep Architecture
podman inspect train-status:latest-arm64 | grep Architecture
```

### Test container
```bash
# Start container
podman-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check logs
podman logs train-status

# Verify it's running
podman ps | grep train-status
```
