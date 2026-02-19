# Concept Updates

This folder stores chronological snapshots of the current product business concept.
Each file captures the state at a specific date and time to track changes in
functionality, value proposition, and operating model.

## File Naming

Format:

`YYYY-MM-DD_HH-mm_concept-<slug>.md`

Examples:

- `2026-02-19_14-13_concept-baseline.md`
- `2026-03-05_09-40_concept-update.md`

Rules:

- Use the team's local time.
- `YYYY-MM-DD_HH-mm` is a required prefix.
- `<slug>` should briefly describe the update type (`baseline`, `update`, `pricing-update`).
- One file equals one state snapshot at creation time.

## Concept File Structure

Each concept file must include:

1. `Meta`:
   - `Snapshot datetime`
   - `Previous snapshot` (for baseline: `none`)
   - `Diff source` (commit/time window used for analysis)
2. Short `Executive summary`
3. `Current user-facing business logic`
4. `Functionality: live / coming soon / planned`
5. `Administration and control`
6. `User data and lawful usage`:
   - allowed without additional consent
   - requires explicit consent
7. `Value for users and partners`

## Rule for Creating a New File

The update sequence is mandatory:

1. Find the latest concept file by date/time in its filename.
2. Use that date and time as the starting point for change analysis.
3. Build a `git` diff from that point.
4. Create a new file from the previous file with a new date/time in the name.
5. Update the new file only with actual changes from the diff and new context.

Recommended commands:

```bash
# 1) Latest concept file
LAST_FILE=$(find docs/concept-updates -maxdepth 1 -type f -name '*.md' \
  ! -name 'README.md' | sort | tail -n 1)

# 2) Timestamp from latest filename
# Example: 2026-02-19_14-13 -> 2026-02-19 14:13
LAST_STAMP=$(basename "$LAST_FILE" | sed -E 's/^([0-9]{4}-[0-9]{2}-[0-9]{2})_([0-9]{2})-([0-9]{2}).*/\1 \2:\3/')

# 3) Commit before that timestamp
BASE_COMMIT=$(git rev-list -1 --before="$LAST_STAMP" HEAD)

# 4) Changes from that point to HEAD
git diff --name-status "$BASE_COMMIT"..HEAD
git log --since="$LAST_STAMP" --oneline --decorate
```

Create a new snapshot:

```bash
NOW=$(date '+%Y-%m-%d_%H-%M')
NEW_FILE="docs/concept-updates/${NOW}_concept-update.md"
cp "$LAST_FILE" "$NEW_FILE"
```

After copying:

- Update the `Meta` block (`Snapshot datetime`, `Previous snapshot`, `Diff source`).
- Review all sections and change only what actually changed.
- Add a short list: "What changed since the previous snapshot."
