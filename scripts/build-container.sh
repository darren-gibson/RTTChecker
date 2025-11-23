#!/bin/bash
# Build script for multi-architecture container images

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
IMAGE_NAME="train-status"

# Parse command line arguments
BUILD_TARGET="${1:-dev}"

case "$BUILD_TARGET" in
  dev|local)
    echo "🔨 Building for local development (ARM64)..."
    podman build --platform linux/arm64 -f "${PROJECT_ROOT}/docker/Dockerfile" -t ${IMAGE_NAME}:latest-arm64 "${PROJECT_ROOT}"
    echo "✅ Built image: ${IMAGE_NAME}:latest-arm64"
    echo ""
    echo "To run locally:"
    echo "  podman-compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d"
    ;;
    
  prod|production|amd64)
    echo "🔨 Building for production deployment (AMD64)..."
    podman build --platform linux/amd64 -f "${PROJECT_ROOT}/docker/Dockerfile" -t ${IMAGE_NAME}:latest-amd64 "${PROJECT_ROOT}"
    echo "✅ Built image: ${IMAGE_NAME}:latest-amd64"
    echo ""
    echo "To run on AMD64 server:"
    echo "  podman-compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d"
    echo ""
    echo "To export and transfer to deployment server:"
    echo "  podman save ${IMAGE_NAME}:latest-amd64 | gzip > ${IMAGE_NAME}-amd64.tar.gz"
    echo "  # Transfer to server, then:"
    echo "  podman load < ${IMAGE_NAME}-amd64.tar.gz"
    ;;
    
  multi|both)
    echo "🔨 Building for both architectures..."
    echo ""
    echo "Building ARM64 (local dev)..."
    podman build --platform linux/arm64 -f "${PROJECT_ROOT}/docker/Dockerfile" -t ${IMAGE_NAME}:latest-arm64 "${PROJECT_ROOT}"
    echo "✅ Built: ${IMAGE_NAME}:latest-arm64"
    echo ""
    echo "Building AMD64 (production)..."
    podman build --platform linux/amd64 -f "${PROJECT_ROOT}/docker/Dockerfile" -t ${IMAGE_NAME}:latest-amd64 "${PROJECT_ROOT}"
    echo "✅ Built: ${IMAGE_NAME}:latest-amd64"
    echo ""
    echo "Both images ready!"
    ;;
    
  *)
    echo "Usage: $0 {dev|prod|multi}"
    echo ""
    echo "  dev   - Build for local development (ARM64/Apple Silicon)"
    echo "  prod  - Build for production deployment (AMD64)"
    echo "  multi - Build both architectures"
    exit 1
    ;;
esac
