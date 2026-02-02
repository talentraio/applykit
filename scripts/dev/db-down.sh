#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.dev.yml"
SERVICE="postgres"
PROJECT_NAME="applykit-dev"

if ! command -v docker >/dev/null 2>&1; then
  echo 'Docker is not installed.'
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo 'Docker is not running. Nothing to stop.'
  exit 0
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Compose file not found: ${COMPOSE_FILE}"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo 'Docker Compose is not available.'
  exit 1
fi

"${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down

echo ''
echo 'PostgreSQL container stopped.'
