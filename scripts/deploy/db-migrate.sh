#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TARGET_ENV="${1:-}"
CONFIRM_FLAG="${2:-}"

print_usage() {
  echo "Usage:"
  echo "  bash ./scripts/deploy/db-migrate.sh preview"
  echo "  bash ./scripts/deploy/db-migrate.sh prod --yes"
}

read_dotenv_value() {
  local key="$1"
  local env_file="${ROOT_DIR}/.env"

  if [ ! -f "$env_file" ]; then
    return 1
  fi

  awk -F= -v search_key="$key" '
    $1 == search_key {
      sub("^[^=]*=", "", $0)
      print $0
      exit
    }
  ' "$env_file"
}

resolve_database_url() {
  if [ -n "${NUXT_DATABASE_URL:-}" ]; then
    echo "${NUXT_DATABASE_URL}"
    return
  fi

  local variable_name="$1"
  local env_value="${!variable_name:-}"

  if [ -n "$env_value" ]; then
    echo "$env_value"
    return
  fi

  read_dotenv_value "$variable_name"
}

if [ "$TARGET_ENV" != "preview" ] && [ "$TARGET_ENV" != "prod" ]; then
  print_usage
  exit 1
fi

if [ "$TARGET_ENV" = "prod" ] && [ "${CI:-}" != "true" ] && [ "$CONFIRM_FLAG" != "--yes" ]; then
  echo "Production migration requires explicit confirmation."
  echo "Run: bash ./scripts/deploy/db-migrate.sh prod --yes"
  exit 1
fi

if [ "$TARGET_ENV" = "preview" ]; then
  DB_URL="$(resolve_database_url PREVIEW_DATABASE_URL)"
else
  DB_URL="$(resolve_database_url PROD_DATABASE_URL)"
fi

if [ -z "${DB_URL:-}" ]; then
  echo "Database URL for '${TARGET_ENV}' environment is not configured."
  echo "Expected env var: NUXT_DATABASE_URL or $( [ "$TARGET_ENV" = "preview" ] && echo PREVIEW_DATABASE_URL || echo PROD_DATABASE_URL )"
  exit 1
fi

echo "Running migrations for '${TARGET_ENV}' environment..."
NUXT_DATABASE_URL="$DB_URL" pnpm --filter @int/api db:migrate
echo "Migrations completed for '${TARGET_ENV}'."
