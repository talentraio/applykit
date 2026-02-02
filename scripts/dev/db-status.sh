#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.dev.yml"
POSTGRES_CONTAINER="applykit-postgres"

if ! command -v docker >/dev/null 2>&1; then
  echo 'Docker is not installed.'
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo 'Docker is not running.'
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Compose file not found: ${COMPOSE_FILE}"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
  echo 'PostgreSQL container is not running.'
  exit 1
fi

if docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres -d resume_editor >/dev/null 2>&1; then
  echo 'PostgreSQL is accepting connections.'
  echo 'Host: localhost'
  echo 'Port: 5432'
  echo 'Database: resume_editor'
  echo 'User: postgres'
  echo 'Password: postgres'
  echo 'Connection: postgresql://postgres:postgres@localhost:5432/resume_editor'
  exit 0
fi

echo 'PostgreSQL is running but not ready yet.'
exit 1
