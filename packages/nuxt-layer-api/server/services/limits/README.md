# Limits Service

Role-based daily operation limits and usage tracking.

## Overview

The limits service enforces fair usage across user tiers by implementing daily operation limits:

- **public**: 3 parse, 2 generate, 5 export per day
- **friend**: 10 parse, 8 generate, 20 export per day
- **super_admin**: unlimited

## Architecture

```
server/
├── services/limits/
│   └── index.ts         # Limits service
├── utils/
│   ├── usage.ts         # Usage tracking (database-backed)
│   └── rate-limiter.ts  # In-memory rate limiter
└── data/repositories/
    └── usage-log.ts     # Usage logs repository
```

## Usage

### Checking Limits in Route Handlers

```typescript
// server/api/parse.post.ts
import { requireLimit } from '~/server/services/limits';

export default defineEventHandler(async event => {
  const user = event.context.user;

  // Automatically throws 429 if limit exceeded
  await requireLimit(user.id, 'parse', user.role);

  // Proceed with operation
  const result = await parseResume({});

  // Log usage after successful operation
  await logUsage(user.id, 'parse', 'platform', tokensUsed, cost);

  return result;
});
```

### Manual Limit Checking

```typescript
import { checkLimit, getRemainingLimit } from '~/server/services/limits';

// Check if user can perform operation
const canParse = await checkLimit(userId, 'parse', 'public');

if (!canParse) {
  // Handle limit exceeded
  return { error: 'Daily limit exceeded' };
}

// Get remaining operations
const remaining = await getRemainingLimit(userId, 'parse', 'public');
console.log(`${remaining} parse operations remaining today`);
```

### Getting Usage Summary

```typescript
import { getUsageSummary } from '~/server/services/limits';

// Get complete usage summary for user
const summary = await getUsageSummary(userId, 'public');

console.log(summary);
// {
//   role: 'public',
//   operations: [
//     { operation: 'parse', used: 2, limit: 3, remaining: 1, percentage: 67 },
//     { operation: 'generate', used: 0, limit: 2, remaining: 2, percentage: 0 },
//     { operation: 'export', used: 5, limit: 5, remaining: 0, percentage: 100 }
//   ],
//   resetAt: '2026-01-24T00:00:00.000Z'
// }
```

## Usage Tracking

### Logging Operations

```typescript
import { logExport, logGenerate, logParse, logUsage } from '~/server/utils/usage';

// Generic logging
await logUsage(userId, 'parse', 'platform', 1500, 0.003);

// Helper functions
await logParse(userId, 'platform', 1500, 0.003);
await logGenerate(userId, 'platform', 2000, 0.004);
await logExport(userId, 'platform'); // No tokens/cost required
```

### Querying Usage

```typescript
import { getDailyCost, getDailyTokensUsed, getDailyUsageCount } from '~/server/utils/usage';

// Get operation count
const parseCount = await getDailyUsageCount(userId, 'parse');

// Get total tokens today
const tokens = await getDailyTokensUsed(userId);

// Get total cost today
const cost = await getDailyCost(userId);
```

## Rate Limiting

In addition to daily limits, you can apply per-second/minute rate limits:

```typescript
import { checkRateLimit, RateLimitPresets } from '~/server/utils/rate-limiter';

export default defineEventHandler(async event => {
  const userId = event.context.user.id;

  // Apply rate limit: 10 requests per minute
  const withinLimit = checkRateLimit(userId, 'parse', RateLimitPresets.strict);

  if (!withinLimit) {
    throw createError({
      statusCode: 429,
      message: 'Rate limit exceeded. Try again in a minute.'
    });
  }

  // Proceed with request
});
```

### Rate Limit Presets

```typescript
RateLimitPresets.veryStrict; // 1 req/sec
RateLimitPresets.strict; // 10 req/min
RateLimitPresets.moderate; // 60 req/min
RateLimitPresets.lenient; // 100 req/min
RateLimitPresets.hourly; // 1000 req/hour
```

### Custom Rate Limits

```typescript
checkRateLimit(userId, 'expensive-operation', {
  maxRequests: 5,
  windowSeconds: 300 // 5 minutes
});
```

## Daily Limits Configuration

Limits are defined in `server/services/limits/index.ts`:

```typescript
const DAILY_LIMITS: Record<Role, Record<Operation, number>> = {
  public: {
    parse: 3,
    generate: 2,
    export: 5
  },
  friend: {
    parse: 10,
    generate: 8,
    export: 20
  },
  super_admin: {
    parse: Infinity,
    generate: Infinity,
    export: Infinity
  }
};
```

To modify limits, update these values and redeploy.

## Error Responses

### 429 Too Many Requests

When daily limit is exceeded:

```json
{
  "statusCode": 429,
  "statusMessage": "Too Many Requests",
  "message": "Daily parse limit exceeded. Limit: 3 per day.",
  "data": {
    "operation": "parse",
    "limit": 3,
    "resetAt": "2026-01-24T00:00:00.000Z"
  }
}
```

## Reset Behavior

Daily limits reset at **midnight UTC** (00:00:00 UTC).

Example:

- User reaches limit at 23:30 UTC on Jan 23
- Limits reset at 00:00:00 UTC on Jan 24
- User can perform operations again

## Usage Patterns

### Parse Endpoint

```typescript
// server/api/resumes/parse.post.ts
export default defineEventHandler(async event => {
  const user = event.context.user;

  // Check limit first
  await requireLimit(user.id, 'parse', user.role);

  // Perform parsing
  const result = await parseResume({});

  // Log usage after success
  await logParse(user.id, 'platform', result.tokensUsed, result.cost);

  return result;
});
```

### Generate Endpoint

```typescript
// server/api/vacancies/[id]/generate.post.ts
export default defineEventHandler(async event => {
  const user = event.context.user;

  // Check limit
  await requireLimit(user.id, 'generate', user.role);

  // Perform generation
  const generation = await generateResume({});

  // Log usage
  await logGenerate(user.id, 'platform', generation.tokensUsed, generation.cost);

  return generation;
});
```

### Export Endpoint

```typescript
// server/api/pdf/prepare.post.ts
export default defineEventHandler(async event => {
  const user = event.context.user;

  // Check limit
  await requireLimit(user.id, 'export', user.role);

  // Perform export (usually no LLM tokens)
  const { token } = await createPdfToken({});

  // Log usage (no tokens/cost for PDF generation)
  await logExport(user.id, 'platform');

  return { token };
});
```

## Dashboard Integration

### Display Usage to Users

```typescript
// server/api/me/usage.get.ts
export default defineEventHandler(async event => {
  const user = event.context.user;

  const summary = await getUsageSummary(user.id, user.role);

  return summary;
});
```

Client can display:

- Progress bars showing usage (e.g., "2/3 parses used")
- Warning when approaching limit
- Reset time countdown

## Admin Monitoring

### Get System-Wide Usage

```typescript
// server/api/admin/usage/stats.get.ts
export default defineEventHandler(async event => {
  // Admin only (middleware checks)

  const stats = await usageLogRepository.getSystemStats();

  return {
    totalOperations: stats.count,
    totalTokens: stats.tokens,
    totalCost: stats.cost
    // ... more stats
  };
});
```

## Testing

### Mock Usage for Tests

```typescript
import { vi } from 'vitest';
import * as usage from '~/server/utils/usage';

vi.spyOn(usage, 'getDailyUsageCount').mockResolvedValue(2); // User has used 2

const canParse = await checkLimit(userId, 'parse', 'public');
expect(canParse).toBe(true); // 2 < 3
```

### Testing Limit Enforcement

```typescript
describe('Limits', () => {
  it('should block when limit exceeded', async () => {
    vi.mocked(getDailyUsageCount).mockResolvedValue(3); // At limit

    await expect(requireLimit(userId, 'parse', 'public')).rejects.toThrow(
      'Daily parse limit exceeded'
    );
  });

  it('should allow super_admin unlimited', async () => {
    vi.mocked(getDailyUsageCount).mockResolvedValue(999999);

    const canParse = await checkLimit(userId, 'parse', 'super_admin');
    expect(canParse).toBe(true);
  });
});
```

## Performance Considerations

### Database Queries

Usage tracking queries the `usage_logs` table daily:

```sql
SELECT COUNT(*)
FROM usage_logs
WHERE user_id = ?
  AND operation = ?
  AND created_at >= CURRENT_DATE
```

This is indexed: `idx_usage_logs_user_operation_date`

### Caching

For high-traffic scenarios, consider caching daily counts:

```typescript
const cache = new Map<string, { count: number; expiresAt: number }>();

export async function getDailyUsageCountCached(
  userId: string,
  operation: Operation
): Promise<number> {
  const key = `${userId}:${operation}`;
  const cached = cache.get(key);

  if (cached && Date.now() < cached.expiresAt) {
    return cached.count;
  }

  const count = await getDailyUsageCount(userId, operation);

  cache.set(key, {
    count,
    expiresAt: Date.now() + 60000 // Cache for 1 minute
  });

  return count;
}
```

## Future Enhancements

Potential improvements:

- **Redis-based rate limiting** for multi-instance deployments
- **Usage quotas** (monthly limits in addition to daily)
- **Burst allowance** (allow brief spikes above limit)
- **Soft limits** (warn at 80%, block at 100%)
- **Custom limits per user** (enterprise plans)
- **Usage analytics dashboard** (charts, trends)

## Related

- **Integration Tests**: TX020 (limits.test.ts)
- **Usage Logs Repository**: T034
- **Auth Middleware**: T041 (provides user context)
- **User Stories**: US2 (parse), US3 (generate), US4 (export)
