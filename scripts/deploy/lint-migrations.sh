#!/usr/bin/env bash
# lint-migrations.sh — checks migration SQL files for common pitfalls.
#
# Run in CI before db-migrate to catch issues early (no DB connection needed).
# Uses POSIX-compatible grep (works on macOS and Linux).
#
# Exit code: 0 = clean or warnings only, 1 = hard errors found.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/../../packages/nuxt-layer-api/server/data/migrations"
ERRORS=0
WARNINGS=0

# Colors (CI-safe: only if stdout is a terminal OR running in GH Actions)
if [ -t 1 ] || [ "${CI:-}" = "true" ]; then
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  GREEN='\033[0;32m'
  NC='\033[0m'
else
  RED='' YELLOW='' GREEN='' NC=''
fi

error() {
  echo -e "${RED}✗  $1${NC}"
  ERRORS=$((ERRORS + 1))
}

warn() {
  echo -e "${YELLOW}⚠  $1${NC}"
  WARNINGS=$((WARNINGS + 1))
}

info() {
  echo -e "   ${NC}$1"
}

echo "Linting migration files in: ${MIGRATIONS_DIR}"
echo ""

# ─── Check 1 [ERROR]: Bare enum column comparison without ::text cast ───
#
# Pattern: "language" = 'value'  (without ::text before the =)
# Safe:    "language"::text = 'value'  or  "language"::text IN (...)
#
# Why: PostgreSQL implicitly casts string literals to the enum type.
# If the enum value doesn't exist yet (e.g. not added by a prior migration,
# or ADD VALUE not committed in the same transaction), the cast fails:
#   "invalid input value for enum cover_letter_language: 'uk-UA'"
# Casting to ::text sidesteps implicit enum validation.

for file in "${MIGRATIONS_DIR}"/*.sql; do
  filename="$(basename "$file")"
  [[ "$filename" == *.sql ]] || continue

  # Find lines with known enum columns used in comparisons without ::text
  # Currently checks: "language" (cover_letter_language enum)
  matches=$(grep -n '"language"' "$file" \
    | grep -E "=|IN" \
    | grep -v '::text' \
    | grep -v 'ADD COLUMN' \
    | grep -v 'ALTER' \
    | grep -v 'TYPE' \
    || true)

  if [ -n "$matches" ]; then
    error "${filename}: enum column compared without ::text cast"
    echo "$matches" | while IFS= read -r line; do
      info "  ${line}"
    done
    info "  Fix: use \"language\"::text = 'value' or \"language\"::text IN (...)"
  fi
done

# ─── Check 2 [WARNING]: ADD VALUE in DO block + DML in same migration ───
#
# PostgreSQL: new enum value added via ADD VALUE is NOT visible to subsequent
# commands until the transaction commits. With statement-breakpoints, each
# segment runs in a separate transaction so this is usually fine.
# Warn for human review — not a hard error.

for file in "${MIGRATIONS_DIR}"/*.sql; do
  filename="$(basename "$file")"
  [[ "$filename" == *.sql ]] || continue

  has_add_value=$(grep -c 'ADD VALUE' "$file" || true)
  has_dml=$(grep -cE '^UPDATE |^INSERT ' "$file" || true)

  if [ "$has_add_value" -gt 0 ] && [ "$has_dml" -gt 0 ]; then
    has_do_block=$(grep -c 'DO \$\$' "$file" || true)
    if [ "$has_do_block" -gt 0 ]; then
      # Check if there are statement-breakpoints between ADD VALUE and DML
      has_breakpoints=$(grep -c 'statement-breakpoint' "$file" || true)
      if [ "$has_breakpoints" -eq 0 ]; then
        error "${filename}: ADD VALUE in DO block + DML without statement-breakpoints"
        info "  Risk: new enum value invisible to later statements in same transaction"
        info "  Fix: add --> statement-breakpoint between ADD VALUE and DML, or use ::text cast"
      else
        warn "${filename}: ADD VALUE in DO block + DML (breakpoints present — review ordering)"
        info "  Ensure breakpoints separate ADD VALUE from DML that uses the new value"
      fi
    fi
  fi
done

# ─── Check 3 [ERROR]: DROP TABLE/COLUMN without IF EXISTS ───

for file in "${MIGRATIONS_DIR}"/*.sql; do
  filename="$(basename "$file")"
  [[ "$filename" == *.sql ]] || continue

  matches=$(grep -inE 'DROP[[:space:]]+(TABLE|COLUMN)[[:space:]]+' "$file" \
    | grep -iv 'IF EXISTS' \
    || true)

  if [ -n "$matches" ]; then
    error "${filename}: DROP TABLE/COLUMN without IF EXISTS"
    echo "$matches" | while IFS= read -r line; do
      info "  ${line}"
    done
    info "  Fix: use DROP TABLE IF EXISTS / DROP COLUMN IF EXISTS"
  fi
done

# ─── Summary ───
echo ""
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}✓ No migration issues found.${NC}"
elif [ "$ERRORS" -eq 0 ]; then
  echo -e "${YELLOW}⚠ ${WARNINGS} warning(s) — review recommended but not blocking.${NC}"
else
  echo -e "${RED}✗ ${ERRORS} error(s), ${WARNINGS} warning(s) in migration files.${NC}"
  echo "  Fix errors before deploying."
  exit 1
fi
