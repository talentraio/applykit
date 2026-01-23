---
description: Create or update the active feature spec.md for the current branch using repo conventions.
handoffs:
  - label: Clarify Spec
    agent: speckit.clarify
    prompt: Ask up to 5 targeted questions to remove ambiguity and write answers back into the spec.
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Create or update the feature specification file (`spec.md`) that downstream workflows (`/speckit.clarify`, `/speckit.plan`, `/speckit.tasks`) can build upon.

This spec MUST align with:

- `.claude/skills/project-conventions/SKILL.md`
- `docs/architecture/*`
- `docs/api/*`
- `docs/codestyle/*`

## Outline

1. **Setup**: Run `.specify/scripts/bash/setup-plan.sh --json` from repo root and parse JSON for:
   - `FEATURE_SPEC`
   - `SPECS_DIR`
   - `BRANCH`
     All paths must be absolute.
     For single quotes in args like "I'm Groot", use escape syntax: e.g. `'I'\''m Groot'` (or double-quote if possible: `"I'm Groot"`).

2. **Load context**:
   - Read `.claude/skills/project-conventions/SKILL.md`
   - Read key docs:
     - `docs/architecture/README.md`
     - `docs/api/README.md`
     - `docs/codestyle/README.md`
   - Read `.specify/memory/constitution.md`
   - If `FEATURE_SPEC` already exists, read it and preserve any manual notes that are still relevant.

3. **Write `FEATURE_SPEC` (spec.md)**:
   Produce a **spec-kit compatible** spec in Markdown. Use clear headings and bullet lists; avoid fluff.

   The spec MUST include:
   - **Overview**
   - **Goals**
   - **Non-goals**
   - **Scope**
   - **Roles & limits** (super_admin / friend / public + BYOK policy)
   - **User flows**
   - **UI/pages** (only what’s in scope)
   - **Data model** (note strict schemas in `@int/schema` using Zod + inferred types)
   - **API surface** (REST endpoints; align with Nuxt/Nitro server conventions)
   - **LLM workflows** (parse + generate; where Zod validation happens)
   - **Limits & safety** (per-user daily limits, global budget cap for platform keys, admin kill switch)
   - **Security & privacy**
   - **i18n keys** (no hardcoded UI strings)
   - **Monorepo/layers touchpoints**:
     - When referencing a layer, ALWAYS include both:
       - repo path: `packages/nuxt-layer-*/`
       - package name: `@int/*`
         Example: `packages/nuxt-layer-api/ (package: @int/api)`
   - **Acceptance criteria**
   - **Edge cases**
   - **Testing plan**
   - **Open questions / NEEDS CLARIFICATION** (use this label explicitly for unresolved decisions)

4. **Stop and report**:
   - Print the detected `BRANCH`
   - Print the `FEATURE_SPEC` path
   - Summarize what was added/changed
   - Recommend next steps: `/speckit.clarify` → `/speckit.plan` → `/speckit.tasks`
