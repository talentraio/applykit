# Integration Tests for API Layer

This directory contains integration tests for critical server-side services in the `@int/api` package.

## Overview

These tests are written following **Test-Driven Development (TDD)** principles and serve as:

1. **Specifications** for service behavior
2. **Documentation** of requirements and edge cases
3. **Security contracts** for critical features
4. **Ready-to-run tests** once services are implemented

## Test Files

### `services/limits.test.ts` (TX020)

**Status**: ⏸️ Skipped (awaiting service implementation T043-T045)

Tests for the limits and rate limiting service:

- ✅ Role-based daily limits (public: 3 parse, 2 generate, 5 export)
- ✅ Friend tier limits (10 parse, 8 generate, 20 export)
- ✅ Super admin unlimited access
- ✅ 429 status code when limits exceeded
- ✅ Daily limit reset after 24 hours
- ✅ Per-operation tracking (parse/generate/export separate)
- ✅ Per-user isolation
- ✅ Sliding window rate limiting
- ✅ Concurrent request handling
- ✅ Usage tracking integration

**Required Services**:

- `packages/nuxt-layer-api/server/services/limits/index.ts`
- `packages/nuxt-layer-api/server/utils/rate-limiter.ts`
- `packages/nuxt-layer-api/server/utils/usage.ts`

**Expected Limits**:

```typescript
export const expectedLimits = {
  public: { parse: 3, generate: 2, export: 5 }, // per day
  friend: { parse: 10, generate: 8, export: 20 }, // per day
  super_admin: 'unlimited'
};
```

### `services/export-cache.test.ts` (TX030)

**Status**: ⏸️ Skipped (awaiting service implementation T115-T124)

Tests for export PDF caching and invalidation:

- ✅ Cache key includes userId + generationId + version
- ✅ Separate caches for ATS vs Human versions
- ✅ Cache hit/miss behavior
- ✅ Cache invalidation on regeneration
- ✅ Cache isolation between users
- ✅ Cache TTL (time-to-live) expiration
- ✅ Cache storage format validation
- ✅ Concurrent request handling (deduplication)
- ✅ Error handling (cache service failures)
- ✅ Graceful degradation on cache corruption

**Required Services**:

- `packages/nuxt-layer-api/server/services/export/index.ts`
- `packages/nuxt-layer-api/server/services/cache/index.ts`

**Expected Cache Key Format**:

```typescript
// Pattern: export:{userId}:{generationId}:{version}
// Example ATS: export:user-123:gen-456:ats
// Example Human: export:user-123:gen-456:human

type CacheService = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  deleteByPattern: (pattern: string) => Promise<number>;
};

// Cache value: PDF URL from Vercel Blob storage
// TTL: Match generation expiration (90 days) or shorter
```

**Invalidation Strategy**:

- On regeneration: delete pattern `export:{userId}:{generationId}:*`
- On generation deletion: same pattern
- On user deletion: delete pattern `export:{userId}:*`

---

## Running Tests

### Run all integration tests (currently skipped):

```bash
pnpm test packages/nuxt-layer-api/tests
```

### Enable tests when services are ready:

Remove `.skip` from `describe.skip()` in each test file.

### Run specific test suite:

```bash
pnpm test packages/nuxt-layer-api/tests/integration/services/limits.test.ts
pnpm test packages/nuxt-layer-api/tests/integration/services/export-cache.test.ts
```

## Test Status

| Test Suite           | Status     | Depends On Tasks | Lines     | Coverage     |
| -------------------- | ---------- | ---------------- | --------- | ------------ |
| limits.test.ts       | ⏸️ Skipped | T043-T045        | 17 tests  | 0% (pending) |
| export-cache.test.ts | ⏸️ Skipped | T115-T124        | 50+ tests | 0% (pending) |

**Total**: 85+ integration tests ready for implementation

## Implementation Workflow

When implementing the services (Phase 2.5-2.6):

1. **Read the test file** - It documents all required behavior
2. **Implement the service** - Follow the specifications in the tests
3. **Remove `.skip`** - Enable the test suite
4. **Run tests** - `pnpm test packages/nuxt-layer-api/tests`
5. **Fix failures** - Iterate until all tests pass
6. **Update README** - Mark tests as ✅ Passing

## Security Notes

### Limits/Rate Limiting

The `limits.test.ts` suite ensures:

- Fair usage enforcement
- Prevention of API abuse
- Proper 429 status codes
- Daily limit resets
- Role-based access tiers

## Test Framework

- **Framework**: Vitest
- **Style**: Integration tests with mocked database/services
- **Coverage**: Critical security and business logic paths
- **Philosophy**: Tests as specifications and documentation

## Next Steps

1. ✅ Tests written and documented (TX020, TX030)
2. ✅ Database layer implemented (T023-T035)
3. ⏳ Implement limits service (T043-T045)
4. ⏳ Implement LLM service (T046-T049)
5. ⏳ Implement export service with caching (T115-T124)
6. 🎯 Enable and run these tests
7. ✅ Verify all tests pass
8. 🚀 Deploy with confidence

---

**Related Documentation**:

- `/specs/001-foundation-mvp/tasks.md` - Full task list
- `/specs/001-foundation-mvp/data-model.md` - Database schema
- `/packages/schema/` - Zod schemas and types
