# Speckit Flow

This repository uses Speckit-style artifacts in `specs/<feature-id>/`.

## Artifact structure

Typical folder contents:

- `spec.md` – product requirements and acceptance criteria
- `plan.md` – technical plan and architecture choices
- `tasks.md` – implementation checklist
- optional: `research.md`, `data-model.md`, `contracts/*`, `quickstart.md`, `checklists/*`

## Simplified flow (small/low-risk changes)

Use this when change scope is narrow and does not require major data/API redesign.

1. `/speckit.specify` (focused scope)
2. `/speckit.tasks`
3. `/speckit.implement`

Guidelines:

- Keep `spec.md` concise and testable.
- Use explicit non-goals to prevent scope drift.
- Keep tasks short and independently verifiable.

## Full flow (default for medium/large changes)

Use this for cross-layer work, API/schema changes, or new domain behavior.

1. `/speckit.specify`
2. `/speckit.clarify` (resolve open questions)
3. `/speckit.plan`
4. `/speckit.tasks`
5. `/speckit.implement`

Recommended quality gates:

- Contracts are documented before implementation.
- Data model impact is explicit.
- Risks and rollback notes exist in `plan.md`.
- `tasks.md` is updated as work progresses.

## Definition of done for Speckit tasks

- `tasks.md` reflects real completion status.
- API/schema docs are updated when interfaces changed.
- Relevant tests pass locally.
- Migration steps are included for DB changes.
