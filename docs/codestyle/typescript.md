# TypeScript rules

## Types
- Prefer `type` over `interface` when either works.
- No `any` unless explicitly justified.
- Keep public types in `@int/schema` when shared across layers/apps.

## Validation
- LLM/parsing services must validate outputs with Zod and return typed results.
- API handlers should receive already-typed values and return typed outputs.
- Client should not pass generics to `$fetch` for API typing.
  If it’s needed, server typing is broken and must be fixed.

## Dates
- Use `YYYY-MM` strings in schema.
