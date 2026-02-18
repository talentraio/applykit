import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('auth-legal-consent-sync.global middleware', () => {
  it('syncs legal consent modal state on navigation', async () => {
    const syncLegalConsentModal = vi.fn();

    vi.stubGlobal('defineNuxtRouteMiddleware', (middleware: () => void) => middleware);
    vi.stubGlobal('useAuth', () => ({
      syncLegalConsentModal
    }));

    const middlewareModule =
      await import('../../../../layers/auth/app/middleware/auth-legal-consent-sync.global');
    const middleware = middlewareModule.default;

    if (typeof middleware !== 'function') {
      throw new TypeError('auth-legal-consent-sync.global middleware is not a function');
    }

    middleware();

    expect(syncLegalConsentModal).toHaveBeenCalledTimes(1);
  });
});
