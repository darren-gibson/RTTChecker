# Container Build

Minimal, multi-arch (amd64 + arm64) containerization for RTTChecker + Matter server.

## Build Options

Script (recommended):

```bash
./scripts/build-container.sh dev      # local arm64
./scripts/build-container.sh prod     # build amd64
./scripts/build-container.sh multi    # both + push
```

Manual (docker/podman):

```bash
docker build -t rttchecker:local .
podman build --platform linux/arm64 -f docker/Dockerfile -t rttchecker:arm64 .
podman build --platform linux/amd64 -f docker/Dockerfile -t rttchecker:amd64 .
```

Multi‑arch push (Buildx):

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/<user>/rttchecker:latest \
  --push .
```

## Compose

Dev:

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up --build
```

Prod:

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d --build
```

Podman alternative: replace `docker` with `podman` / `podman-compose`.

## Podman Usage

Install Podman (macOS):

```bash
brew install podman podman-compose
podman machine init
podman machine start
```

Build with Podman:

```bash
podman build -f docker/Dockerfile -t rttchecker:latest .
```

Run with Podman Compose (dev):

```bash
cd /path/to/RTTChecker
podman-compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up --build
```

Run with Podman Compose (prod):

```bash
podman-compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d --build
```

### Environment Variables

The compose files use `env_file` to load environment variables from `.env`.

**Setup:**

1. Copy the example file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials and settings:

   ```bash
   RTT_USER=your_user
   RTT_PASS=your_pass
   LOG_FORMAT=plain
   LOG_LEVEL=info
   # ... other variables
   ```

3. Run compose:
   ```bash
   podman-compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up --build
   ```

All environment variables and their defaults are documented in `.env.example`.

### Log Formatting

Set `LOG_FORMAT=plain` to get human-readable logs with timestamp, level, facility, and message:

```
2025-11-30 14:28:37.093 ERROR rtt-checker          ❌ Configuration validation failed
```

Without `LOG_FORMAT=plain`, logs default to JSON (useful for structured log aggregation).

To verify the environment reached the container:

```bash
podman ps -a --format '{{.Names}} {{.Image}}'
podman exec -it train-status env | grep -E 'LOG_FORMAT|LOG_LEVEL|RTT_USER'
```

To view recent logs:

```bash
podman logs --tail=100 train-status
```

## Runtime

Basic run:

```bash
docker run --rm -it -p 5540:5540 \
  -e RTT_API_KEY=... -e STATION_FROM=CBG -e STATION_TO=LCD \
  -e MATTER_PORT=5540 rttchecker:local
```

Timed commissioning check: add `-e EXIT_AFTER_MS=20000`.

## Image Structure

Multi‑stage Dockerfile: builder installs deps; runtime copies app & prunes dev deps. Env vars resolved at run time.

## Tagging

Use semver + `latest`. Optional arch suffixes: `rttchecker:1.2.0-arm64`, `rttchecker:1.2.0-amd64`.

## Security

Base: `node:24-alpine<ALPINE_VERSION>` (default 3.21) with `apk upgrade --no-cache`.
Override Alpine:

```bash
docker build --build-arg ALPINE_VERSION=3.21 -t rttchecker:test .
```

Scan:

```bash
trivy image rttchecker:arm64
trivy image rttchecker:amd64
```

Podman variant:

```bash
podman run --rm -v $PWD:/work aquasec/trivy:latest image rttchecker:amd64
```

## macOS Note

Podman uses a VM; `--network host` not a true host network. For local rapid debug you can run `node index.js` directly instead of container.

## Verify

```bash
docker images | grep rttchecker
docker inspect rttchecker:amd64 | grep Architecture
docker logs <container>
```

## Troubleshooting

- Buildx errors: `docker buildx ls`; recreate builder; ensure QEMU present.
- Missing env vars: set `RTT_USER`, `RTT_PASS`, and other required variables. Use `.env` file or inline exports.
- Port conflict: change `MATTER_PORT` / host mapping.
- Architecture mismatch: rebuild with `--platform` or use script.
- Logs still JSON: confirm `LOG_FORMAT=plain` is set and passed to compose; check with `podman exec -it <container> env | grep LOG_FORMAT`.
- Podman context errors: ensure compose files use `context: ..` (parent directory) and `dockerfile: docker/Dockerfile` (relative to repo root).
- Podman machine not started: run `podman machine start` before building or running containers.

## CI (Hint)

Use standard GitHub Actions: setup QEMU + Buildx → build & push multi‑arch → cache deps.

## Summary

Enables fast local dev, prod deployment, multi‑arch publishing, security scanning, short commissioning runs.
