---
name: help
description: List available Codex commands and usage hints.
argument-hint: |
  <optional filter>
  Example: spec
---

List all command files in `.codex/commands` (exclude this file) and show:

- command name (file stem)
- short description from front matter if present (`description:`)
- argument-hint example if present (`argument-hint:`)

If `$ARGUMENTS` is provided, filter the list by case-insensitive substring match on the command name.

Invocation:

- `/command-name`
- `Use command: command-name`

Example usage:

```
Use command: help
```

```
Use command: help
spec
```
