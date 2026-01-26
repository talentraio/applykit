# TypeScript rules

## Types

- Prefer `type` over `interface` when either works.
- No `any` unless explicitly justified.
- Keep public types in `@int/schema` when shared across layers/apps.

## Validation

- LLM/parsing services must validate outputs with Zod and return typed results.
- API handlers should receive already-typed values and return typed outputs.
- Client should not pass generics to `$fetch` for API typing.
  If it’s needed, server typing is broken and must be fixed.

## Dates

- Use `YYYY-MM` strings in schema.
- Use `date-fns` for date formatting/parsing and date arithmetic in app/server code.
- Avoid `Intl.DateTimeFormat` and `toLocale*` for user-facing dates; keep native `Date`
  only for persistence timestamps or UTC-boundary operations.

### When to use `new Date()`

**Acceptable uses** (creating timestamps):

- Database timestamps: `createdAt: new Date()`, `updatedAt: new Date()`
- API response timestamps when ISO string conversion is automatic
- Starting point for date arithmetic: `addDays(new Date(), 7)`, `subMonths(new Date(), 1)`
- Current time checks: `if (someDate > new Date())`

**Use date-fns instead**:

- User-facing date formatting: `format(date, 'MMM d, yyyy')` not `date.toLocaleDateString()`
- Date parsing: `parseISO(dateString)` not `new Date(dateString)`
- Date arithmetic: `addDays(date, 7)` not `date.setDate(date.getDate() + 7)`
- Time manipulation: `startOfDay(date)`, `endOfMonth(date)` not manual setHours/setMinutes

**Example patterns**:

```typescript
// ✅ Good: Creating timestamp for DB
const user = await userRepository.create({
  email,
  createdAt: new Date()
});

// ✅ Good: Date arithmetic starting from now
const expiresAt = addDays(new Date(), 90);

// ✅ Good: Formatting for user display
const formattedDate = format(parseISO(user.createdAt), 'MMM d, yyyy');

// ❌ Bad: Manual date manipulation
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

// ❌ Bad: Locale-based formatting
const display = new Intl.DateTimeFormat('en-US').format(date);
```
