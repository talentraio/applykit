---
description: Execute one or more development tasks, and optionally mark specific task IDs as completed in the active feature tasks.md.
allowed-tools: Bash(npx:*), Bash(npm:*), Bash(pnpm:*), Read, Edit, Write, Delete, Grep, Glob, Ripgrep
argument-hint: |
  TASK_IDS: T001,T002,TX010
  TASK: <what to implement>
---

Execute the work described in $ARGUMENTS.

## How to use

Provide task IDs **explicitly** if you want the command to mark them as done:

```text
TASK_IDS: T001,T002,TX010
TASK: Implement the pnpm workspace setup and add schema helper tests.
```

If `TASK_IDS:` is missing, **DO NOT** modify any `tasks.md` files.

## Process

1. **Parse input**

- Extract `TASK_IDS` from `$ARGUMENTS` only if provided as `TASK_IDS: ...` (comma/space separated).
- Extract the remaining text as the task description to execute.

2. **Locate active feature directory**

- From repo root, run:
  - `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`
- Parse JSON and resolve:
  - `FEATURE_DIR`
- Set:
  - `FEATURE_TASKS = $FEATURE_DIR/tasks.md`
- If this script is missing or fails, stop and ask for the feature directory path.

3. **Load required context (always)**

- Read and follow:
  - `.claude/skills/project-conventions/SKILL.md`
  - `docs/*` (only the files relevant to this task)

**UI/Design guardrail (mandatory):**

- If the task touches UI/UX (any of: `ui`, `ux`, `design`, `layout`, `landing`, `homepage`, `page`, `component`, `nuxt ui`, `nuxtui`, `ui pro`, `styles`, `theme`, `colors`, `typography`, `header`, `footer`, `navbar`, `sidebar`, `dashboard`), then **before changing code**:
  - Read and follow `docs/design/mvp.md` (design contract).
  - If the task is about the homepage/landing, also read `docs/architecture/homepage.md`.
- If `docs/design/mvp.md` is missing, STOP and ask to add it (do not guess design).

4. **Execute the requested task work**

- Analyze requirements, implement changes, run relevant commands (lint/typecheck/tests) as needed.
- Keep changes small and reviewable.
- Ensure all UI strings use i18n keys (no hardcoded copy).

5. **Mark tasks as completed (ONLY if TASK_IDS were provided)**

- For each ID in `TASK_IDS`:
  - Find a line in `FEATURE_TASKS` matching: `- [ ] <ID> `
  - Replace with: `- [x] <ID> `
  - If the task is already checked, leave it.
  - If the ID is not found, report it and do not invent new tasks.
- Do not change any other content/ordering in `tasks.md`.

6. **Report**

- Summarize what was changed, what commands were run, and which task IDs were marked as complete.
- If UI was changed, confirm compliance with `docs/design/mvp.md` (SaaS for site, Dashboard for admin, primary=violet, neutral=slate, system color mode with dark fallback).

- Summarize what was changed, what commands were run, and which task IDs were marked as complete.
