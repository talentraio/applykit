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

1) **Parse input**
- Extract `TASK_IDS` from `$ARGUMENTS` only if provided as `TASK_IDS: ...` (comma/space separated).
- Extract the remaining text as the task description to execute.

2) **Locate active feature directory**
- From repo root, run:
  - `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`
- Parse JSON and resolve:
  - `FEATURE_DIR`
- Set:
  - `FEATURE_TASKS = $FEATURE_DIR/tasks.md`
- If this script is missing or fails, stop and ask for the feature directory path.

3) **Execute the requested task work**
- Analyze requirements, implement changes, run relevant commands (lint/typecheck/tests) as needed.
- Keep changes small and reviewable.
- Follow repo conventions from `.claude/skills/project-conventions/SKILL.md` and `docs/*`.

4) **Mark tasks as completed (ONLY if TASK_IDS were provided)**
- For each ID in `TASK_IDS`:
  - Find a line in `FEATURE_TASKS` matching: `- [ ] <ID> `
  - Replace with: `- [x] <ID> `
  - If the task is already checked, leave it.
  - If the ID is not found, report it and do not invent new tasks.
- Do not change any other content/ordering in `tasks.md`.

5) **Report**
- Summarize what was changed, what commands were run, and which task IDs were marked as complete.
