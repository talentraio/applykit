# Data Model: Vacancy Detail Page Restructuring

**Feature**: 005-new-vacancy-flow
**Date**: 2026-02-04

## Entity Changes

### Vacancy (Extended)

**Current Schema** (`packages/schema/schemas/vacancy.ts`):

```typescript
export const VacancySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  company: z.string().min(1).max(255),
  jobPosition: z.string().max(255).nullable().optional(),
  description: z.string().min(1),
  url: z.string().url().max(2048).nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});
```

**New Schema** (with status field):

```typescript
import { VacancyStatusSchema } from './enums';

export const VacancySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  company: z.string().min(1).max(255),
  jobPosition: z.string().max(255).nullable().optional(),
  description: z.string().min(1),
  url: z.string().url().max(2048).nullable().optional(),
  notes: z.string().nullable().optional(),
  status: VacancyStatusSchema.default('created'), // NEW
  createdAt: z.date(),
  updatedAt: z.date()
});
```

## New Enum: VacancyStatus

**Location**: `packages/schema/constants/enums.ts`

```typescript
export const VACANCY_STATUS_MAP = {
  CREATED: 'created',
  GENERATED: 'generated',
  SCREENING: 'screening',
  REJECTED: 'rejected',
  INTERVIEW: 'interview',
  OFFER: 'offer'
} as const;

export const VACANCY_STATUS_VALUES = [
  VACANCY_STATUS_MAP.CREATED,
  VACANCY_STATUS_MAP.GENERATED,
  VACANCY_STATUS_MAP.SCREENING,
  VACANCY_STATUS_MAP.REJECTED,
  VACANCY_STATUS_MAP.INTERVIEW,
  VACANCY_STATUS_MAP.OFFER
] as const;
```

**Location**: `packages/schema/schemas/enums.ts`

```typescript
import { VACANCY_STATUS_MAP } from '../constants/enums';

export const VacancyStatusSchema = z.nativeEnum(VACANCY_STATUS_MAP);
export type VacancyStatus = z.infer<typeof VacancyStatusSchema>;
```

## Status State Machine

### State Diagram

```
                    ┌─────────────────────────────────────────────────┐
                    │                                                 │
                    ▼                                                 │
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────┐
│ created │───▶│ generated │───▶│ screening │───▶│ interview │───▶│ offer │
└─────────┘    └───────────┘    └───────────┘    └───────────┘    └───────┘
     │              │                 │                │
     │              │                 ▼                │
     │              │           ┌──────────┐          │
     │              │           │ rejected │◀─────────┘
     │              │           └──────────┘
     │              │                 │
     └──────────────┴─────────────────┘
            (manual backward transitions)
```

### Transition Rules

| From      | To        | Trigger                  | Constraint                             |
| --------- | --------- | ------------------------ | -------------------------------------- |
| created   | generated | First generation success | Automatic only                         |
| created   | screening | Manual                   | User action                            |
| created   | interview | Manual                   | User action                            |
| created   | offer     | Manual                   | User action                            |
| created   | rejected  | Manual                   | User action                            |
| generated | screening | Manual                   | User action                            |
| generated | interview | Manual                   | User action                            |
| generated | offer     | Manual                   | User action                            |
| generated | rejected  | Manual                   | User action                            |
| screening | interview | Manual                   | User action                            |
| screening | offer     | Manual                   | User action                            |
| screening | rejected  | Manual                   | User action                            |
| screening | generated | Manual                   | If generation exists                   |
| interview | offer     | Manual                   | User action                            |
| interview | rejected  | Manual                   | User action                            |
| interview | generated | Manual                   | If generation exists                   |
| offer     | \*        | Manual                   | Any status (celebration can be undone) |
| rejected  | \*        | Manual                   | Any status (rejection can be reversed) |

### Contextual Status Options

**Logic for dropdown options**:

```typescript
function getAvailableStatuses(
  currentStatus: VacancyStatus,
  hasGeneration: boolean
): VacancyStatus[] {
  // All possible forward statuses
  const allStatuses = ['created', 'generated', 'screening', 'rejected', 'interview', 'offer'];

  // Filter based on generation existence
  if (hasGeneration) {
    // Cannot go back to 'created' if generation exists
    return allStatuses.filter(s => s !== 'created' && s !== currentStatus);
  } else {
    // Cannot select 'generated' if no generation exists
    return allStatuses.filter(s => s !== 'generated' && s !== currentStatus);
  }
}
```

## Database Migration

**File**: `packages/nuxt-layer-api/server/database/migrations/00XX_add_vacancy_status.ts`

```typescript
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export async function up(db: PostgresJsDatabase) {
  // Add status column with default 'created'
  await db.execute(sql`
    ALTER TABLE vacancies
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'created'
  `);

  // Add check constraint for valid values
  await db.execute(sql`
    ALTER TABLE vacancies
    ADD CONSTRAINT vacancy_status_check
    CHECK (status IN ('created', 'generated', 'screening', 'rejected', 'interview', 'offer'))
  `);
}

export async function down(db: PostgresJsDatabase) {
  await db.execute(sql`
    ALTER TABLE vacancies DROP CONSTRAINT vacancy_status_check
  `);
  await db.execute(sql`
    ALTER TABLE vacancies DROP COLUMN status
  `);
}
```

## Drizzle Schema Update

**File**: `packages/nuxt-layer-api/server/database/schema/vacancy.ts`

```typescript
import { pgTable, varchar /* ... */ } from 'drizzle-orm/pg-core';

export const vacancies = pgTable('vacancies', {
  // ... existing columns
  status: varchar('status', { length: 20 }).notNull().default('created')
  // ... existing columns
});
```

## Related Types

### VacancyInput (Updated)

```typescript
export const VacancyInputSchema = VacancySchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true
}).extend({
  // Make status optional in input (defaults to 'created' on create)
  status: VacancyStatusSchema.optional()
});

export type VacancyInput = z.infer<typeof VacancyInputSchema>;
```

### Status Color Mapping (UI Helper)

```typescript
// apps/site/layers/vacancy/app/utils/statusColors.ts

import type { VacancyStatus } from '@int/schema';

export const STATUS_COLORS: Record<VacancyStatus, string> = {
  created: 'neutral',
  generated: 'primary',
  screening: 'warning',
  rejected: 'error',
  interview: 'success',
  offer: 'violet'
} as const;

export function getStatusColor(status: VacancyStatus): string {
  return STATUS_COLORS[status];
}
```

## Validation Rules

1. **On Create**: Status defaults to 'created', cannot be set to 'generated'
2. **On Update**: Status can be any valid value except 'generated' (unless generation exists)
3. **On Generation Success**: Auto-update to 'generated' only if current status is 'created'
4. **Type Safety**: All status values must be from `VacancyStatus` type

## Index Considerations

No new indexes required. Status column will be small cardinality (6 values), filtering by status will use sequential scan which is efficient for expected data volumes (<1000 vacancies per user).
