import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('auth-modal-sync.global middleware', () => {
  it('syncs modal state with current route query', async () => {
    const syncAuthModalFromQuery = vi.fn();

    vi.stubGlobal(
      'defineNuxtRouteMiddleware',
      (middleware: (to: { query: Record<string, unknown> }) => void) => middleware
    );
    vi.stubGlobal('useAuth', () => ({
      syncAuthModalFromQuery
    }));

    const middlewareModule =
      await import('../../../../layers/auth/app/middleware/auth-modal-sync.global');
    const middleware = middlewareModule.default;

    if (typeof middleware !== 'function') {
      throw new TypeError('auth-modal-sync.global middleware is not a function');
    }

    const query = {
      auth: 'forgot',
      redirect: '/auth/post-login'
    };

    middleware({ query });

    expect(syncAuthModalFromQuery).toHaveBeenCalledWith(query);
  });
});
