# Testing Guide

## Test layers

- Unit and integration: Vitest
- End-to-end: Playwright

## Commands

All tests:

```bash
pnpm test
```

Watch mode:

```bash
pnpm test:watch
```

Coverage:

```bash
pnpm test:coverage
```

E2E:

```bash
pnpm e2e
```

E2E UI mode:

```bash
pnpm e2e:ui
```

## Targeted test execution

Run a single file/scope while iterating:

```bash
pnpm vitest run path/to/test-file.test.ts
```

## What to run before commit

Minimum recommended:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

For UI-heavy or routing changes, also run:

```bash
pnpm e2e
```
