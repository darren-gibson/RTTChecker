#!/usr/bin/env bash
set -euo pipefail

# Deploy script using Artifact Registry + Cloud Run and Secret Manager
# This script expects you to have already created Secret Manager secrets:
#   rtt-user  (holds RTT_USER)
#   rtt-pass  (holds RTT_PASS)
# It maps those secrets into the Cloud Run service as environment variables
# at runtime using --set-secrets so secrets are never present in logs or
# local environment.

PROJECT=${PROJECT:-$(gcloud config get-value project 2>/dev/null || echo "")}
REGION=${REGION:-europe-west2}
SERVICE=${SERVICE:-rttchecker}
REPOSITORY=${REPOSITORY:-europe-west2-docker.pkg.dev/${PROJECT}/cloud-run-source-deploy}
IMAGE="${REPOSITORY}/${SERVICE}:latest"

if [ -z "$PROJECT" ]; then
  echo "No GCP project configured. Run 'gcloud config set project YOUR_PROJECT' or set PROJECT env."
  exit 1
fi

echo "Building image and pushing to Artifact Registry: $IMAGE"
gcloud builds submit --region="$REGION" --tag "$IMAGE"

echo "Deploying to Cloud Run: $SERVICE in $REGION"
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets RTT_USER=rtt-user:latest,RTT_PASS=rtt-pass:latest \
  --quiet

echo "Deployment finished. The service will receive RTT_USER and RTT_PASS from Secret Manager at runtime."