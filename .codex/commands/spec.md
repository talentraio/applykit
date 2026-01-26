---
name: spec
description: Write or update a spec-kit style spec for a feature/epic in this repo.
argument-hint: |
  Feature: Admin role management
  or
  Update: specs/001-foundation-mvp/spec.md
disable-model-invocation: true
---

You are working in this repo.

Source of truth:

- .codex/skills/project-conventions/SKILL.md
- docs/architecture/\*
- docs/api/\*
- docs/codestyle/\*

Task:
Produce a spec-kit compatible spec (Markdown) for: $ARGUMENTS

Hard constraints (must be reflected in the spec):

- Nuxt v4 + NuxtUI v4
- i18n from day 1 (all new UI copy must be keys)
- Check VueUse first; prefer existing composables
- Use Nuxt docs MCP + NuxtUI docs MCP when framework specifics are needed.
  If MCP is required but not working: stop and ask the user (do not guess).
- Strict schemas in @int/schema (Zod + inferred types)
- Store/actions pattern for API calls
- ATS/Human pages use server-side islands rendering

Monorepo convention (must be explicit in "Implementation notes / Repo touchpoints"):

- Layer packages live under: packages/nuxt-layer-\*/ (repo path)
- They are referenced by package name: @int/\* (package.json)
- Always include both forms when referencing a layer, e.g.
  "packages/nuxt-layer-api/ (package: @int/api)"

Spec must include:

- Problem + goals
- Non-goals
- User flows
- Data model changes (with @int/schema notes if relevant)
- API endpoints (new/changed)
- i18n keys (if UI copy changes)
- Security & privacy notes
- Acceptance criteria
- Test plan (unit/e2e)
- Rollout notes (feature flags, migrations, backfills)
- Implementation notes / Repo touchpoints (paths + package names)
- Open questions / assumptions (if anything is unclear)
