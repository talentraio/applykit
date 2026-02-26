# Product Concepts

This folder stores feature-level product concepts that are prepared before Speckit specs.

## Purpose

- Capture a practical, codebase-aligned concept before implementation planning.
- Keep a traceable chain:
  - `raw concept` -> `clarification log` -> `final concept`.
- Avoid jumping into `specs/` before key product decisions are explicit.

## File naming

Recommended format:

`YYYY-MM-DD_<feature-slug>-<stage>.md`

Examples:

- `2026-02-20_cover-letter-raw-concept.md`
- `2026-02-20_cover-letter-mvp-plus-1-backlog.md`
- `2026-02-21_cover-letter-final-concept.md`

## Stages

- `raw-concept`: first aggregated concept aligned with current code/docs.
- `mvp-plus-1-backlog`: explicitly deferred scope that should not be lost between discussions.
- `final-concept`: clarified concept, ready for Speckit input.

## Working rule

- `raw-concept` files live in this folder.
- Temporary discussion notes should live in `tmp/` and be treated as working material.
