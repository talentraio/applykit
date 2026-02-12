# Database Layer

Drizzle ORM-based data layer for the `@int/api` package with PostgreSQL (all environments).

## Overview

This directory contains the complete database infrastructure:

- **Schema definitions** (`schema.ts`) - Drizzle ORM schemas matching domain types
- **Database connection** (`db.ts`) - Environment-based connection management
- **Migrations** (`migrations/`) - SQL migration files
- **Repositories** (`repositories/`) - Data access layer (to be implemented)

## Database Configuration

### Local Development (PostgreSQL)

```bash
# Recommended: start the local Postgres container
pnpm db:up

# Default connection string:
# postgresql://postgres:postgres@localhost:5432/resume_editor
# Override with NUXT_DATABASE_URL if needed
```

### Production (PostgreSQL)

```bash
# Set environment variable
export NUXT_DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

## Schema

All tables are defined in `schema.ts` using Drizzle ORM:

| Table            | Purpose                            | Key Fields                                 |
| ---------------- | ---------------------------------- | ------------------------------------------ |
| `users`          | Authenticated users (Google OAuth) | email, googleId, role                      |
| `profiles`       | User profiles (1:1 with users)     | firstName, lastName, workFormat, languages |
| `resumes`        | Uploaded resumes (parsed to JSON)  | userId, title, content (JSONB)             |
| `vacancies`      | Job vacancies for tailoring        | userId, company, jobPosition, description  |
| `generations`    | Tailored resume versions           | vacancyId, resumeId, content, matchScores  |
| `usage_logs`     | Operation tracking                 | userId, operation, providerType, cost      |
| `system_configs` | System configuration               | key, value (JSONB)                         |

### Enums

- `role`: super_admin, friend, public
- `work_format`: remote, hybrid, onsite
- `source_file_type`: docx, pdf
- `llm_provider`: openai, gemini
- `operation`: parse, generate, export
- `provider_type`: platform

## Migrations

### Creating Migrations

```bash
# Generate migration from schema changes
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Push schema directly (dev only - skips migration files)
pnpm db:push
```

### Initial Migration

The first migration (`001_init.sql`) creates:

- All 8 tables with indexes
- 6 enum types
- Initial system configuration
- Table and column comments

### Migration Files

```
migrations/
├── 001_init.sql          # Initial schema (T026)
├── meta/                 # Drizzle metadata (auto-generated)
└── [future migrations]
```

## Database Scripts

Available in `package.json`:

| Script             | Command                | Purpose                         |
| ------------------ | ---------------------- | ------------------------------- |
| `pnpm db:generate` | `drizzle-kit generate` | Generate migration from schema  |
| `pnpm db:migrate`  | `drizzle-kit migrate`  | Apply migrations to database    |
| `pnpm db:push`     | `drizzle-kit push`     | Push schema directly (dev only) |
| `pnpm db:studio`   | `drizzle-kit studio`   | Open Drizzle Studio GUI         |

## Drizzle Studio

Visual database browser:

```bash
pnpm db:studio
# Opens at http://localhost:4983
```

## Type Safety

Drizzle provides full type inference:

```typescript
import type { NewUser, User } from './schema';
import { db } from './db';
import { users } from './schema';

// Fully typed queries
const allUsers = await db.select().from(users);
//    ^? User[]

// Insert with type checking
const newUser: NewUser = {
  email: 'user@example.com',
  googleId: 'google123',
  role: 'public' // Type-safe enum
};
await db.insert(users).values(newUser);
```

## Repositories

Data access layer pattern (to be implemented in T028-T035):

```typescript
// Example: packages/nuxt-layer-api/server/data/repositories/user.ts
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../schema';

export const userRepository = {
  async findById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] ?? null;
  },

  async create(data: NewUser) {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }

  // More methods...
};
```

## Security Notes

### Platform Keys (CRITICAL)

Platform provider keys are stored in server runtime config and must never be exposed to clients:

- ❌ NEVER store platform API keys in database tables
- ❌ NEVER expose platform API keys to browser code
- ✅ Load platform API keys from secure environment/runtime config
- ✅ Keep server-side request logs sanitized

### Connection Security

- Production: Use SSL/TLS for PostgreSQL connections
- Credentials: Store in environment variables, never in code
- Connection pooling: Configured in `db.ts` (max 10 connections)

## File Structure

```
server/data/
├── README.md              # This file
├── db.ts                  # Database connection (T024)
├── schema.ts              # Drizzle schema definitions (T025)
├── migrations/
│   ├── 001_init.sql       # Initial migration (T026)
│   └── meta/              # Drizzle metadata
└── repositories/          # Data access layer (T028-T035) ✅
    ├── index.ts           # Barrel export
    ├── user.ts            # User repository ✅
    ├── profile.ts         # Profile repository ✅
    ├── resume.ts          # Resume repository ✅
    ├── vacancy.ts         # Vacancy repository ✅
    ├── generation.ts      # Generation repository ✅
    ├── usage-log.ts       # Usage Log repository ✅
    └── system-config.ts   # System Config repository ✅
```

## Environment Variables

| Variable            | Required                                         | Default                                                       | Purpose                      |
| ------------------- | ------------------------------------------------ | ------------------------------------------------------------- | ---------------------------- |
| `NUXT_DATABASE_URL` | Production only (dev defaults to local Postgres) | `postgresql://postgres:postgres@localhost:5432/resume_editor` | PostgreSQL connection string |
| `NODE_ENV`          | No                                               | development                                                   | Environment mode             |

## Repository Methods Summary

Each repository provides standard CRUD operations plus domain-specific methods:

### userRepository (T028)

- `findById`, `findByEmail`, `findByGoogleId`
- `create`, `updateRole`, `updateLastLogin`
- `existsByEmail`, `findByRole`

### profileRepository (T029)

- `findByUserId`, `findById`
- `create`, `update`, `delete`
- `existsForUser`, `isComplete`

### resumeRepository (T030)

- `findById`, `findByIdAndUserId`, `findByUserId`
- `create`, `updateContent`, `updateTitle`, `delete`
- `countByUserId`, `findLatestByUserId`

### vacancyRepository (T031)

- `findById`, `findByIdAndUserId`, `findByUserId`
- `create`, `update`, `delete`
- `countByUserId`, `findLatestByUserId`

### generationRepository (T032)

- `findById`, `findByVacancyId`, `findLatestByVacancyId`
- `create`, `delete`, `deleteByVacancyId`, `deleteByResumeId`
- `findExpired`, `deleteExpired`, `isValidGeneration`

### usageLogRepository (T034)

- `log`, `getDailyCount` (for rate limiting)
- `findByUserId`, `findByDateRange`
- `getTotalCost`, `getTotalTokens`
- `getOperationBreakdown`, `getProviderTypeBreakdown`
- `deleteOlderThan` (cleanup)

### systemConfigRepository (T035)

- `get`, `getBoolean`, `getNumber`, `getPlatformProvider`
- `set`, `setBoolean`, `setNumber`, `setPlatformProvider`
- `getAll`, `resetToDefaults`
- `incrementBudgetUsed`, `canUsePlatformLLM`

## Next Steps

1. ✅ Database schema created (T023-T027)
2. ✅ Repositories implemented (T028-T035)
3. ⏳ Add repository integration tests
4. ⏳ Use in API endpoints (Phase 3+)
5. 🚀 Deploy with migrations

## Related Documentation

- `/specs/001-foundation-mvp/data-model.md` - Complete data model specification
- `/specs/001-foundation-mvp/tasks.md` - Task list and dependencies
- `/@int/schema` - Zod schemas and TypeScript types
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
