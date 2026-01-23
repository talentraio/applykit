<!--
Sync Impact Report
- Version change: N/A -> 1.0.0
- Modified principles: N/A (new constitution)
- Added sections: Core Principles, Additional Constraints, Development Workflow, Governance
- Templates requiring updates:
  - .specify/templates/spec-template.md (updated)
  - .specify/templates/tasks-template.md (updated)
- Follow-up TODOs: none
-->

# ApplyKit Constitution

## Core Principles

### I. Documentation Is Binding

- Before any code changes, read and follow `docs/codestyle/base.md`.
- Read any other docs needed for the task (docs/architecture/_, docs/api/_,
  docs/codestyle/\*).
- If docs and code disagree, update docs first or pause for clarification.

### II. Nuxt Stack Invariants

- Nuxt v4 and NuxtUI v4 only.
- Use Nuxt/NuxtUI MCP docs for framework-specific APIs. If MCP is unavailable,
  stop and ask for a fix (do not guess).
- Check VueUse first; prefer existing composables.

### III. Schema-First Contracts

- Shared types live in `@int/schema` with Zod validation and inferred types.
- Services validate external/LLM outputs; endpoints operate on typed values.
- Client code must not pass generics to `$fetch` for typing.

### IV. Store/Action Data Flow

- Pinia stores own data flow; UI components call store actions.
- API calls should follow the store/actions pattern, not ad-hoc fetch logic.

### V. i18n and SSR Requirements

- All user-facing strings use i18n keys from day one.
- ATS/Human views remain SSR-friendly and use server-side islands rendering.

## Additional Constraints

- Formatting is handled by Prettier; ESLint must not conflict with Prettier.
- UI work must follow `docs/design/mvp.md` when applicable.

## Development Workflow

- Specs and tasks must include the documentation gate from Principle I.
- Use spec-kit to generate specs/tasks and keep templates in sync.
- Tests are required for risky logic (limits, auth, encryption, caching).

## Governance

- This constitution supersedes other guidance when conflicts arise.
- Changes require updating this file and the spec-kit templates.
- Reviews must verify compliance with the principles above.

**Version**: 1.0.0 | **Ratified**: 2026-01-23 | **Last Amended**: 2026-01-23
