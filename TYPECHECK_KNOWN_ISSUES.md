# Known TypeCheck Issues

## NuxtUI v4 Tabs Slot Types (2 errors)

**File:** `apps/site/app/pages/resumes/[id].vue`  
**Lines:** 103, 116  
**Error:** Property 'editor'/'preview' does not exist on type 'TabsSlots'

### Description

NuxtUI v4 doesn't properly infer dynamic slot types from the `items` prop. The slots `#editor` and `#preview` work correctly at runtime but TypeScript cannot validate them during typecheck.

### Status

This is a known limitation in NuxtUI v4's type definitions. The code is functionally correct and these errors can be safely ignored.

### Workaround

These errors will be resolved when NuxtUI v4 improves its slot type inference or when we upgrade to a version with better typing support.
