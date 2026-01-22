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
public: { parse: 3/day, generate: 2/day, export: 5/day }
friend: { parse: 10/day, generate: 8/day, export: 20/day }
super_admin: unlimited
```

---

### `services/byok-keys.test.ts` (TX021)
**Status**: ⏸️ Skipped (awaiting service implementation T046-T049, T125-T127)

Tests for BYOK (Bring Your Own Key) security:
- 🔒 **CRITICAL**: Keys encrypted at rest
- 🔒 **CRITICAL**: Only last 4 chars stored as hint
- 🔒 **CRITICAL**: Full keys NEVER logged
- ✅ Keys stored in browser localStorage only
- ✅ HTTPS-only transmission
- ✅ Key validation without logging
- ✅ Multiple keys per user (one per provider)
- ✅ User-scoped key access/deletion
- ✅ Sanitized error messages
- ✅ Timing attack prevention
- ✅ BYOK vs platform usage tracking

**Required Services**:
- `packages/nuxt-layer-api/server/services/llm/types.ts`
- `packages/nuxt-layer-api/server/services/llm/providers/openai.ts`
- `packages/nuxt-layer-api/server/services/llm/providers/gemini.ts`
- `packages/nuxt-layer-api/server/api/keys/index.{get,post}.ts`
- `packages/nuxt-layer-api/server/api/keys/[id].delete.ts`

**Security Requirements**:
```typescript
// Database stores ONLY hint
interface LLMKey {
  id: string
  userId: string
  provider: 'openai' | 'gemini'
  keyHint: string  // Last 4 chars ONLY
  createdAt: Date
}

// Full key lives in browser localStorage
// Sent with each request, used once, cleared from memory
```

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
pnpm test packages/nuxt-layer-api/tests/integration/services/byok-keys.test.ts
```

## Test Status

| Test Suite | Status | Depends On Tasks | Lines | Coverage |
|------------|--------|------------------|-------|----------|
| limits.test.ts | ⏸️ Skipped | T043-T045 | 17 tests | 0% (pending) |
| byok-keys.test.ts | ⏸️ Skipped | T046-T049, T125-T127 | 18 tests | 0% (pending) |

**Total**: 35 integration tests ready for implementation

## Implementation Workflow

When implementing the services (Phase 2.5-2.6):

1. **Read the test file** - It documents all required behavior
2. **Implement the service** - Follow the specifications in the tests
3. **Remove `.skip`** - Enable the test suite
4. **Run tests** - `pnpm test packages/nuxt-layer-api/tests`
5. **Fix failures** - Iterate until all tests pass
6. **Update README** - Mark tests as ✅ Passing

## Security Notes

### BYOK Key Handling (CRITICAL)
The `byok-keys.test.ts` suite includes security-critical tests:

- ❌ **NEVER** store full keys in database
- ❌ **NEVER** log full keys (console, files, monitoring)
- ✅ **ALWAYS** store only last 4 characters as hint
- ✅ **ALWAYS** transmit keys over HTTPS
- ✅ **ALWAYS** sanitize keys from error messages
- ✅ **ALWAYS** clear keys from memory after use

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

1. ✅ Tests written and documented (TX020, TX021)
2. ⏳ Implement database layer (T023-T035)
3. ⏳ Implement limits service (T043-T045)
4. ⏳ Implement LLM service (T046-T049)
5. ⏳ Implement BYOK API routes (T125-T127)
6. 🎯 Enable and run these tests
7. ✅ Verify all tests pass
8. 🚀 Deploy with confidence

---

**Related Documentation**:
- `/specs/001-foundation-mvp/tasks.md` - Full task list
- `/specs/001-foundation-mvp/data-model.md` - Database schema
- `/packages/schema/` - Zod schemas and types
