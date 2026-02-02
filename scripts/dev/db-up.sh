#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.dev.yml"
SERVICE="postgres"
PROJECT_NAME="applykit-dev"
POSTGRES_CONTAINER="applykit-postgres"

print_docker_install_hint() {
  local os
  os="$(uname -s 2>/dev/null || echo unknown)"

  echo ''
  echo 'Docker is required to run the local PostgreSQL container.'
  echo 'Install Docker:'

  case "$os" in
    Darwin)
      echo '  macOS: Install Docker Desktop https://docs.docker.com/desktop/install/mac-install/'
      ;;
    Linux)
      echo '  Linux: Install Docker Engine https://docs.docker.com/engine/install/'
      ;;
    MINGW*|MSYS*|CYGWIN*)
      echo '  Windows: Install Docker Desktop https://docs.docker.com/desktop/install/windows-install/'
      ;;
    *)
      echo '  https://docs.docker.com/get-docker/'
      ;;
  esac
}

start_docker_daemon() {
  local os
  os="$(uname -s 2>/dev/null || echo unknown)"

  case "$os" in
    Darwin)
      if command -v open >/dev/null 2>&1; then
        echo 'Starting Docker Desktop...'
        open -a Docker >/dev/null 2>&1 || true
      fi
      ;;
    Linux)
      if command -v systemctl >/dev/null 2>&1; then
        echo 'Starting Docker service...'
        systemctl start docker >/dev/null 2>&1 || true
      elif command -v service >/dev/null 2>&1; then
        echo 'Starting Docker service...'
        service docker start >/dev/null 2>&1 || true
      fi
      ;;
    MINGW*|MSYS*|CYGWIN*)
      if command -v powershell.exe >/dev/null 2>&1; then
        echo 'Starting Docker Desktop...'
        powershell.exe -NoProfile -Command "Start-Process 'Docker Desktop'" >/dev/null 2>&1 || true
      fi
      ;;
    *)
      ;;
  esac
}

wait_for_docker() {
  local timeout_seconds=60
  local elapsed=0

  until docker info >/dev/null 2>&1; do
    sleep 1
    elapsed=$((elapsed + 1))
    if [ "$elapsed" -ge "$timeout_seconds" ]; then
      return 1
    fi
  done

  return 0
}

wait_for_postgres() {
  local timeout_seconds=60
  local elapsed=0

  echo 'Waiting for PostgreSQL to be ready...'

  until docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres -d resume_editor >/dev/null 2>&1; do
    sleep 1
    elapsed=$((elapsed + 1))
    if [ "$elapsed" -ge "$timeout_seconds" ]; then
      return 1
    fi
  done

  return 0
}

if ! command -v docker >/dev/null 2>&1; then
  echo 'Docker is not installed.'
  print_docker_install_hint
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo 'Docker is installed but not running. Attempting to start it...'
  start_docker_daemon
  if ! wait_for_docker; then
    echo 'Docker did not start within 60 seconds.'
    echo 'Please start Docker manually and try again.'
    exit 1
  fi
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
  print_docker_install_hint
  exit 1
fi

"${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d "$SERVICE"

if ! wait_for_postgres; then
  echo 'PostgreSQL did not become ready within 60 seconds.'
  exit 1
fi

echo ''
echo 'PostgreSQL is running.'
echo 'Host: localhost'
echo 'Port: 5432'
echo 'Database: resume_editor'
echo 'User: postgres'
echo 'Password: postgres'
echo 'Connection: postgresql://postgres:postgres@localhost:5432/resume_editor'
