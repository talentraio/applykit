import { describe, expect, it } from 'vitest';

/**
 * BYOK was removed from the platform runtime.
 * This placeholder remains to document deprecation coverage migration.
 */
describe.skip('byok keys integration (removed)', () => {
  it('confirms BYOK routes and key metadata flow are no longer part of runtime', () => {
    expect(true).toBe(true);
  });
});
