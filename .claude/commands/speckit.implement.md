---
description: Execute the implementation plan by processing and executing all tasks defined in tasks.md
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

0. **Repo conventions (must follow)**:
   - Read `.claude/skills/project-conventions/SKILL.md` and relevant `docs/*`.
   - Nuxt v4 + NuxtUI v4 only; i18n from day 1; VueUse-first.
   - ATS/Human pages must remain SSR-friendly and use server-side islands rendering.
   - Strict schemas belong in `@int/schema` (Zod + inferred types). Runtime validation belongs in services, not endpoints.

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list.
   - All paths must be absolute.
   - For single quotes in args like "I'm Groot", use escape syntax: e.g `I'\''m Groot` (or double-quote if possible: `"I'm Groot"`).

2. **Check checklists status** (if `FEATURE_DIR/checklists/` exists):
   - Scan all checklist files in the `checklists/` directory
   - For each checklist, count:
     - Total items: All lines matching `- [ ]` or `- [X]` or `- [x]`
     - Completed items: Lines matching `- [X]` or `- [x]`
     - Incomplete items: Lines matching `- [ ]`
   - Create a status table:

     ```text
     | Checklist | Total | Completed | Incomplete | Status |
     |-----------|-------|-----------|------------|--------|
     | ux.md     | 12    | 12        | 0          | ✓ PASS |
     | test.md   | 8     | 5         | 3          | ✗ FAIL |
     | security.md | 6   | 6         | 0          | ✓ PASS |
     ```

   - Calculate overall status:
     - **PASS**: All checklists have 0 incomplete items
     - **FAIL**: One or more checklists have incomplete items

   - **If any checklist is incomplete**:
     - Display the table with incomplete item counts
     - If user input contains `--force`: proceed anyway (with a warning)
     - Otherwise **STOP** and ask: "Some checklists are incomplete. Do you want to proceed with implementation anyway? (yes/no)"
       - If user says "no"/"wait"/"stop": halt execution
       - If user says "yes"/"proceed"/"continue": proceed to step 3

   - **If all checklists are complete**:
     - Display the table showing all checklists passed
     - Automatically proceed to step 3

3. **Context cache & change detection (token saver)**:
   - Goal: avoid re-reading large docs if they have not changed since the last implementation run.
   - Cache location: `FEATURE_DIR/.cache/implement-context.json`
   - Cache directory: ensure `FEATURE_DIR/.cache/` exists (create if missing).
   - Define the “context inputs” to fingerprint:
     - **REQUIRED**
       - `FEATURE_DIR/tasks.md`
       - `FEATURE_DIR/plan.md`
     - **OPTIONAL** (include only if exists)
       - `FEATURE_DIR/data-model.md`
       - `FEATURE_DIR/research.md`
       - `FEATURE_DIR/quickstart.md`
       - All files under `FEATURE_DIR/contracts/` (recursive)
   - For each existing context input, compute:
     - `abs_path` (absolute path)
     - `mtime_epoch` (last modified time, seconds since epoch)
     - `sha256` (content hash)
   - Store/read cache with this minimal structure:

     ```json
     {
       "version": 1,
       "inputs": {
         "/abs/path/to/FEATURE_DIR/tasks.md": { "mtime_epoch": 1700000000, "sha256": "..." },
         "/abs/path/to/FEATURE_DIR/plan.md": { "mtime_epoch": 1700000001, "sha256": "..." }
       },
       "summaries": {
         "tasks": { "sha256": "...", "summary": "..." },
         "plan": { "sha256": "...", "summary": "..." },
         "data_model": { "sha256": "...", "summary": "..." },
         "contracts": { "sha256": "...", "summary": "..." },
         "research": { "sha256": "...", "summary": "..." },
         "quickstart": { "sha256": "...", "summary": "..." }
       },
       "indexes": {
         "tasks_index": {
           "sha256": "...",
           "phases": [],
           "tasks": []
         }
       }
     }
     ```

   - **Fingerprint rules**:
     - Use `sha256sum` (or equivalent) for file hashing.
     - For `contracts/`, compute a single aggregate hash:
       - Sort all contract file paths deterministically.
       - Concatenate each file’s `sha256` in that order and hash the concatenated string to produce `contracts.sha256`.
   - **Reuse rules** (to save tokens):
     - If cached `sha256` for a file matches current `sha256`, you may **reuse the cached summary/index** and **must not re-read the full file**.
     - If a file is missing from cache or its hash differs, you **must** re-read that file and regenerate its summary (and update cache).
   - **Safety rule**:
     - Even when using cached summaries, you **must** read `tasks.md` minimally enough to safely:
       - identify the current phase being executed,
       - find the next unchecked tasks,
       - mark tasks as [X] when complete.
     - The “minimal read” means: if the cached `tasks_index` is valid (hash match), you can avoid reading the whole file and instead read only the relevant section(s) needed for updates.
   - **On-demand reads**:
     - If, during implementation, a task touches something unclear from summaries (e.g. exact API contract detail, file path, schema shape), you may read the specific source file/section **on-demand** and then refresh the relevant cached summary if the content hash changed.

4. Load and analyze the implementation context (using cache from step 3):
   - **REQUIRED**:
     - Obtain `tasks_index` (from cache if `tasks.md` hash unchanged; otherwise generate by reading `tasks.md`)
     - Obtain `plan_summary` (from cache if `plan.md` hash unchanged; otherwise read `plan.md` and summarize)
   - **IF EXISTS**:
     - `data_model_summary` from `data-model.md`
     - `contracts_summary` from `contracts/` (aggregate)
     - `research_summary` from `research.md`
     - `quickstart_summary` from `quickstart.md`
   - **Summary requirements** (keep them compact but sufficient):
     - Plan summary must include: tech stack constraints, directory structure conventions, key architectural decisions, any critical “do/don’t”.
     - Tasks index must include: phases, per-task IDs (if present), descriptions, target file paths, [P] markers, dependencies/order constraints.

5. **Project Setup Verification**:
   - **REQUIRED**: Create/verify ignore files based on actual project setup.

   **Detection & Creation Logic**:
   - Check if the following command succeeds to determine if the repository is a git repo (create/verify `.gitignore` if so):

     ```sh
     git rev-parse --git-dir 2>/dev/null
     ```

   - Check if Dockerfile\* exists or Docker in plan.md → create/verify `.dockerignore`
   - Check if `.eslintrc*` exists → create/verify `.eslintignore`
   - Check if `eslint.config.*` exists → ensure the config's `ignores` entries cover required patterns
   - Check if `.prettierrc*` exists → create/verify `.prettierignore`
   - Check if `.npmrc` or `package.json` exists → create/verify `.npmignore` (if publishing)
   - Check if terraform files (`*.tf`) exist → create/verify `.terraformignore`
   - Check if `.helmignore` needed (helm charts present) → create/verify `.helmignore`

   **If ignore file already exists**: Verify it contains essential patterns, append missing critical patterns only  
   **If ignore file missing**: Create with full pattern set for detected technology

   **Common Patterns by Technology** (from plan.md tech stack):
   - **Node.js/JavaScript/TypeScript**: `node_modules/`, `dist/`, `build/`, `*.log`, `.env*`
   - **Python**: `__pycache__/`, `*.pyc`, `.venv/`, `venv/`, `dist/`, `*.egg-info/`
   - **Java**: `target/`, `*.class`, `*.jar`, `.gradle/`, `build/`
   - **C#/.NET**: `bin/`, `obj/`, `*.user`, `*.suo`, `packages/`
   - **Go**: `*.exe`, `*.test`, `vendor/`, `*.out`
   - **Ruby**: `.bundle/`, `log/`, `tmp/`, `*.gem`, `vendor/bundle/`
   - **PHP**: `vendor/`, `*.log`, `*.cache`, `*.env`
   - **Rust**: `target/`, `debug/`, `release/`, `*.rs.bk`, `*.rlib`, `*.prof*`, `.idea/`, `*.log`, `.env*`
   - **Kotlin**: `build/`, `out/`, `.gradle/`, `.idea/`, `*.class`, `*.jar`, `*.iml`, `*.log`, `.env*`
   - **C++**: `build/`, `bin/`, `obj/`, `out/`, `*.o`, `*.so`, `*.a`, `*.exe`, `*.dll`, `.idea/`, `*.log`, `.env*`
   - **C**: `build/`, `bin/`, `obj/`, `out/`, `*.o`, `*.a`, `*.so`, `*.exe`, `Makefile`, `config.log`, `.idea/`, `*.log`, `.env*`
   - **Swift**: `.build/`, `DerivedData/`, `*.swiftpm/`, `Packages/`
   - **R**: `.Rproj.user/`, `.Rhistory`, `.RData`, `.Ruserdata`, `*.Rproj`, `packrat/`, `renv/`
   - **Universal**: `.DS_Store`, `Thumbs.db`, `*.tmp`, `*.swp`, `.vscode/`, `.idea/`

   **Tool-Specific Patterns**:
   - **Docker**: `node_modules/`, `.git/`, `Dockerfile*`, `.dockerignore`, `*.log*`, `.env*`, `coverage/`
   - **ESLint**: `node_modules/`, `dist/`, `build/`, `coverage/`, `*.min.js`
   - **Prettier**: `node_modules/`, `dist/`, `build/`, `coverage/`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
   - **Terraform**: `.terraform/`, `*.tfstate*`, `*.tfvars`, `.terraform.lock.hcl`
   - **Kubernetes/k8s**: `*.secret.yaml`, `secrets/`, `.kube/`, `kubeconfig*`, `*.key`, `*.crt`

6. Parse `tasks.md` structure and extract (prefer cached `tasks_index` if valid):
   - **Task phases**: Setup, Tests, Core, Integration, Polish (or whatever is present)
   - **Task dependencies**: Sequential vs parallel execution rules
   - **Task details**: ID, description, file paths, parallel markers `[P]`
   - **Execution flow**: Order and dependency requirements

7. Execute implementation following the task plan:
   - **Phase-by-phase execution**: Complete each phase before moving to the next
   - **Respect dependencies**: Run sequential tasks in order, parallel tasks `[P]` can run together
   - **Follow TDD approach**: Execute test tasks before their corresponding implementation tasks
   - **File-based coordination**: Tasks affecting the same files must run sequentially
   - **Validation checkpoints**: Verify each phase completion before proceeding
   - **On-demand context reads**: If a task requires precision not present in summaries, read only the needed file/section.

8. Implementation execution rules:
   - **Setup first**: Initialize project structure, dependencies, configuration
   - **Tests before code**: If you need to write tests for contracts, entities, and integration scenarios
   - **Core development**: Implement models, services, CLI commands, endpoints
   - **Integration work**: Database connections, middleware, logging, external services
   - **Polish and validation**: Unit tests, performance optimization, documentation

9. Progress tracking and error handling:
   - Report progress after each completed task
   - Halt execution if any non-parallel task fails
   - For parallel tasks `[P]`, continue with successful tasks, report failed ones
   - Provide clear error messages with context for debugging
   - Suggest next steps if implementation cannot proceed
   - **IMPORTANT** For completed tasks, make sure to mark the task off as `[X]` in the tasks file.
   - After updating `tasks.md`, update the cached `tasks_index` hash/metadata if needed.

10. Completion validation:

- Verify all required tasks are completed
- Check that implemented features match the original specification
- Validate that tests pass and coverage meets requirements
- Confirm the implementation follows the technical plan
- Report final status with summary of completed work

Note: This command assumes a complete task breakdown exists in `tasks.md`. If tasks are incomplete or missing, suggest running `/speckit.tasks` first to regenerate the task list.
